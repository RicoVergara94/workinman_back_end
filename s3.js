require("dotenv").config();

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});

async function uploadFile(file) {
  const uploadParams = {
    Bucket: bucketName,
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(uploadParams);
  try {
    await s3.send(command);
    console.log("Image uploaded successfully");
  } catch (e) {
    console.log("Error Message: " + e);
    throw new Error("Failed to upload image");
  } finally {
  }
}
exports.uploadFile = uploadFile;

// downloads a file from s3
function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName,
  };

  return s3.getObject(downloadParams).createReadStream();
}
exports.getFileStream = getFileStream;

const getImageUrls = async (username, database) => {
  const query = `select * from questions where username='${username}';`;
  const rows = await new Promise((res, rej) => {
    database.all(query, [], (err, rows) => {
      if (err) {
        rej(err);
      } else {
        res(rows);
      }
    });
  });

  for (const row of rows) {
    const getObjectParams = {
      Bucket: bucketName,
      Key: row.image_name,
    };

    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    row.imageUrl = url;
  }
  // console.log(rows);
  return rows;
};

exports.getImageUrls = getImageUrls;
