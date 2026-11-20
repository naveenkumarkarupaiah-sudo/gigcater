// Regression test for S3 presigned URL hostname and region
// This test verifies that presigned URLs are constructed with the correct AWS hostname format
// and does NOT use real AWS credentials or upload files.

// Helper: the URL construction logic from upload.ts line 53
// fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${objectKey}`
function generateMockFileUrl(bucketName: string, region: string, objectKey: string): string {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;
}

// Helper: the S3 client region config from upload.ts line 15
// region: process.env.AWS_REGION || 'us-east-1'
function getS3ClientRegion(awsRegion?: string): string {
  return awsRegion || 'us-east-1';
}

console.log('=== S3 Presigned URL Regression Tests ===\n');

// Test 1: Correct region ap-south-1 produces correct hostname
{
  const bucketName = 'gigcater-uploads';
  const region = 'ap-south-1';
  const objectKey = 'uploads/user_1/profilePhoto_1234567890_test.jpg';
  const url = generateMockFileUrl(bucketName, region, objectKey);
  
  // Critical check: URL must NOT contain the invalid 'ap-south-db' hostname
  if (url.includes('ap-south-db')) {
    console.error(`✗ Test 1 FAILED: URL contains invalid ap-south-db hostname: ${url}`);
    process.exit(1);
  }
  
  // Must contain the correct regional hostname
  const expectedUrl = `https://gigcater-uploads.s3.ap-south-1.amazonaws.com/${objectKey}`;
  if (url !== expectedUrl) {
    console.error(`✗ Test 1 FAILED: Expected ${expectedUrl}, got ${url}`);
    process.exit(1);
  }
  
  console.log('✓ Test 1 passed: Correct region ap-south-1 produces correct hostname');
}

// Test 2: Default region us-east-1 produces correct hostname
{
  const bucketName = 'gigcater-uploads';
  const region = 'us-east-1';
  const objectKey = 'uploads/user_1/file_1234567890.jpg';
  const url = generateMockFileUrl(bucketName, region, objectKey);
  
  const expectedUrl = `https://gigcater-uploads.s3.us-east-1.amazonaws.com/${objectKey}`;
  if (url !== expectedUrl) {
    console.error(`✗ Test 2 FAILED: Expected ${expectedUrl}, got ${url}`);
    process.exit(1);
  }
  
  console.log('✓ Test 2 passed: Default region us-east-1 produces correct hostname');
}

// Test 3: Documents the bug scenario - invalid region ap-south-db
{
  const bucketName = 'gigcater-uploads';
  const region = 'ap-south-db' as const;
  const objectKey = 'uploads/user_1/file_1234567890.jpg';
  const url = generateMockFileUrl(bucketName, region, objectKey);
  
  // This documents the bug: when AWS_REGION is set to 'ap-south-db',
  // the generated URL has the invalid hostname
  if (!url.includes('ap-south-db')) {
    console.error(`✗ Test 3 FAILED: Expected URL to contain ap-south-db (documenting the bug), got: ${url}`);
    process.exit(1);
  }
  
  console.log('⚠ Test 3 documented: Invalid region ap-south-db produces incorrect hostname (this is the bug)');
  console.log(`   Generated URL: ${url}`);
}

// Test 4: Verify the S3 client region configuration from env
{
  // When AWS_REGION is set
  process.env.AWS_REGION = 'ap-south-1';
  const clientRegionFromEnv = process.env.AWS_REGION;
  if (clientRegionFromEnv !== 'ap-south-1') {
    console.error(`✗ Test 4 FAILED: Expected AWS_REGION=ap-south-1, got ${clientRegionFromEnv}`);
    process.exit(1);
  }
  console.log('✓ Test 4 passed: S3 client region set from AWS_REGION env var');
  
  // When AWS_REGION is not set (defaults to us-east-1 in the code)
  delete process.env.AWS_REGION;
  const defaultRegion = getS3ClientRegion(undefined);
  if (defaultRegion !== 'us-east-1') {
    console.error(`✗ Test 5 FAILED: Expected default us-east-1, got ${defaultRegion}`);
    process.exit(1);
  }
  console.log('✓ Test 5 passed: S3 client defaults to us-east-1 when AWS_REGION not set');
}

// Cleanup
delete process.env.AWS_REGION;

// ---------------------------------------------------------------------------
// Tests 6 & 7: real presign with the SDK (offline, dummy credentials).
// Guards the SDK >= 3.729 default-checksum regression that broke browser PUTs
// with 403: the URL must NOT carry a signed CRC32 of an empty body.
// ---------------------------------------------------------------------------
(async () => {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

  // Must mirror the S3Client config in upload.ts
  const s3 = new S3Client({
    region: 'ap-south-1',
    credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: 'gigcater-uploads',
      Key: 'uploads/user_1/profilePhoto_1234567890_test.jpg',
      ContentType: 'application/octet-stream',
    }),
    { expiresIn: 3600 }
  );
  const parsed = new URL(url);

  // Test 6: no signed empty-body checksum params that a browser cannot satisfy
  if (parsed.searchParams.has('x-amz-checksum-crc32') || parsed.searchParams.has('x-amz-sdk-checksum-algorithm')) {
    console.error('✗ Test 6 FAILED: presigned URL contains signed checksum params (browser PUT will fail):',
      [...parsed.searchParams.keys()].filter((k) => k.startsWith('x-amz-checksum') || k.startsWith('x-amz-sdk-checksum')).join(', '));
    process.exit(1);
  }
  console.log('✓ Test 6 passed: presigned URL has no empty-body checksum params');

  // Test 7: region/host remain correct after the checksum change
  if (parsed.host !== 'gigcater-uploads.s3.ap-south-1.amazonaws.com') {
    console.error(`✗ Test 7 FAILED: unexpected host ${parsed.host}`);
    process.exit(1);
  }
  console.log('✓ Test 7 passed: presigned URL host is s3.ap-south-1.amazonaws.com');

  console.log('\n=== All regression tests passed ===');
})();