// Helper: the URL construction logic from upload.ts line 53
// fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${objectKey}`
export function generateMockFileUrl(bucketName: string, region: string, objectKey: string): string {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;
}

// Helper: the S3 client region config from upload.ts line 15
// region: process.env.AWS_REGION || 'us-east-1'
export function getS3ClientRegion(awsRegion?: string): string {
  return awsRegion || 'us-east-1';
}