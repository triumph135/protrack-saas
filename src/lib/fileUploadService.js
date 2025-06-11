// src/lib/fileUploadService.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

class FileUploadService {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.currentTenant = null
    this.currentUser = null
  }

  setContext(tenantId, userId) {
    this.currentTenant = tenantId
    this.currentUser = userId
  }

  // Validate file before upload
  validateFile(file) {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
      'application/pdf', 'image/tiff'
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed. Please upload JPG, PNG, GIF, WebP, PDF, or TIFF files.')
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.')
    }

    return true
  }

  // Generate secure file path with tenant isolation
  generateFilePath(entityType, entityId, fileName) {
    if (!this.currentTenant) {
      throw new Error('No tenant context')
    }
    
    // Create tenant-isolated path: tenant_id/entity_type/entity_id/filename
    const timestamp = Date.now()
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${this.currentTenant}/${entityType}/${entityId}/${timestamp}_${cleanFileName}`
  }

  // Upload file to Supabase Storage
  async uploadFile(file, entityType, entityId, description = '') {
    try {
      if (!this.currentTenant || !this.currentUser) {
        throw new Error('User must be authenticated with tenant context')
      }

      this.validateFile(file)

      const filePath = this.generateFilePath(entityType, entityId, file.name)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Save attachment record to database
      const { data: attachmentData, error: dbError } = await this.supabase
        .from('attachments')
        .insert([{
          tenant_id: this.currentTenant,
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: filePath,
          uploaded_by: this.currentUser,
          description: description
        }])
        .select()
        .single()

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await this.supabase.storage.from('attachments').remove([filePath])
        throw new Error(`Database error: ${dbError.message}`)
      }

      return attachmentData

    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }

  // Get attachments for an entity
  async getAttachments(entityType, entityId) {
    if (!this.currentTenant) {
      throw new Error('No tenant context')
    }

    const { data, error } = await this.supabase
      .from('attachments')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(name)
      `)
      .eq('tenant_id', this.currentTenant)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching attachments: ${error.message}`)
    }

    return data
  }

  // Get file download URL
  async getFileUrl(storagePath) {
    if (!this.currentTenant) {
      throw new Error('No tenant context')
    }

    // Verify the file belongs to current tenant (security check)
    if (!storagePath.startsWith(this.currentTenant + '/')) {
      throw new Error('Access denied to file')
    }

    const { data } = await this.supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    return data?.signedUrl
  }

  // Delete attachment
  async deleteAttachment(attachmentId) {
    if (!this.currentTenant || !this.currentUser) {
      throw new Error('User must be authenticated')
    }

    // Get attachment details first (for security validation)
    const { data: attachment, error: fetchError } = await this.supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('tenant_id', this.currentTenant)
      .single()

    if (fetchError || !attachment) {
      throw new Error('Attachment not found or access denied')
    }

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from('attachments')
      .remove([attachment.storage_path])

    if (storageError) {
      console.warn('Storage deletion failed:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await this.supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('tenant_id', this.currentTenant)

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`)
    }

    return true
  }

  // Update attachment description
  async updateAttachment(attachmentId, description) {
    if (!this.currentTenant) {
      throw new Error('No tenant context')
    }

    const { data, error } = await this.supabase
      .from('attachments')
      .update({ description })
      .eq('id', attachmentId)
      .eq('tenant_id', this.currentTenant)
      .select()
      .single()

    if (error) {
      throw new Error(`Update failed: ${error.message}`)
    }

    return data
  }
}

export const fileUploadService = new FileUploadService()