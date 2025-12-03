import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';

export async function action({request, context}) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const productId = formData.get('productId');

    if (!file || !(file instanceof File)) {
      return Response.json({error: 'No file provided'}, {status: 400});
    }

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!validTypes.includes(file.type)) {
      return Response.json({error: 'Invalid file type'}, {status: 400});
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({error: 'File too large (max 10MB)'}, {status: 400});
    }

    // Get AWS credentials from environment variables
    const {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      AWS_S3_BUCKET,
    } = context.env;

    if (
      !AWS_ACCESS_KEY_ID ||
      !AWS_SECRET_ACCESS_KEY ||
      !AWS_REGION ||
      !AWS_S3_BUCKET
    ) {
      console.error('Missing AWS environment variables');
      return Response.json(
        {error: 'Server configuration error'},
        {status: 500},
      );
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const fileName = `artwork/${timestamp}-${randomString}.${fileExtension}`;

    // Convert file to Uint8Array (works in Workers runtime)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: fileName,
      Body: uint8Array,
      ContentType: file.type,
      // Make the file publicly readable
      ACL: 'public-read',
    });

    await s3Client.send(command);

    // Construct the public URL
    const fileUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;

    return Response.json({
      success: true,
      url: fileUrl,
      filename: file.name,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      {error: 'Failed to upload file', details: error.message},
      {status: 500},
    );
  }
}
