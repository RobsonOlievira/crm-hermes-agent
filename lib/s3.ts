import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client, getBucketConfig } from '@/lib/aws-config'

function shouldServeInline(contentType: string): boolean {
  return (
    (contentType.startsWith('image/') && contentType !== 'image/svg+xml') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/')
  )
}

export async function generatePresignedUploadUrl(fileName: string, contentType: string, isPublic = false) {
  const { bucketName, folderPrefix } = getBucketConfig()
  const client = createS3Client()
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`
  const command = new PutObjectCommand({ Bucket: bucketName, Key: cloud_storage_path, ContentType: contentType })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
  return { uploadUrl, cloud_storage_path }
}

export function getPublicUrl(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig()
  const region = process.env.AWS_REGION ?? 'us-east-1'
  const encoded = cloud_storage_path.split('/').map(encodeURIComponent).join('/')
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encoded}`
}

export async function getFileUrl(cloud_storage_path: string, contentType: string, isPublic: boolean) {
  if (isPublic) return getPublicUrl(cloud_storage_path)
  const client = createS3Client()
  const { bucketName } = getBucketConfig()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: shouldServeInline(contentType) ? 'inline' : 'attachment',
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}
