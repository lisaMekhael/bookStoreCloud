import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

// AWS SDK v3 Configuration with Hardcoded Values
const client = new DynamoDBClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIAVRUVWIZAFQFS4BPZ",
    secretAccessKey: "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",
  },
});

const s3 = new S3Client({ region: "us-east-1" });
const upload = multer({ dest: "../uploads/" });
const AWS_S3_BUCKET_NAME_BEFORE = "bucketbeforeresize";
const AWS_S3_BUCKET_NAME_AFTER = "bucketafterresize";

// Controller for creating a new book
export const createBook = async (req, res) => {
  try {
    const { title, author, publishYear } = req.body;
    const { file } = req;

    console.log("FILE:", file);

    let imageUrl = null;

    if (file) {
      const uploadParams = {
        Bucket: AWS_S3_BUCKET_NAME_BEFORE,
        Key: `${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      const command = new PutObjectCommand(uploadParams);
      const data = await s3.send(command);

      imageUrl = `https://${AWS_S3_BUCKET_NAME_AFTER}.s3.amazonaws.com/${uploadParams.Key}`;
      console.log("IMAGE URL:", imageUrl);
    }

    const params = {
      TableName: "Books",
      Item: {
        id: { S: new Date().toISOString() },
        title: { S: req.body.title },
        author: { S: req.body.author },
        publishYear: { N: req.body.publishYear.toString() },
        createdAt: { S: new Date().toISOString() },
        updatedAt: { S: new Date().toISOString() },
        imageUrl: { S: imageUrl },
      },
    };

    const command = new PutItemCommand(params);
    const data = await client.send(command);
    res.status(201).send("Data inserted successfully!");
  } catch (error) {
    console.log("Error inserting data into database", error);
    res.status(500).send({ message: error.message });
  }
};

// Controller for getting all books
// Controller for getting all books
export const getAllBooks = async (req, res) => {
  try {
    const params = {
      TableName: "Books",
    };

    const command = new ScanCommand(params);
    const data = await client.send(command);
    console.log("Raw data from DynamoDB:", data);

    const books = data.Items.map((item) => ({
      id: item.id?.S,
      title: item.title?.S,
      author: item.author?.S,
      publishYear: item.publishYear?.N,
      createdAt: item.createdAt?.S,
      updatedAt: item.updatedAt?.S,
      imageUrl: item.imageUrl?.S,
    }));

    res.status(200).json({
      count: books.length,
      data: books,
    });
  } catch (error) {
    console.log("Error fetching data from database", error);
    res.status(500).send({ message: error.message });
  }
};

// Controller for getting a book by ID
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("ID:", id);

    const params = {
      TableName: "Books",
      Key: {
        id: { S: id },
      },
    };

    const command = new GetItemCommand(params);
    const data = await client.send(command);

    if (!data.Item) {
      return res.status(404).json({ message: "Book not found!" });
    }

    const book = {
      id: data.Item.id?.S,
      title: data.Item.title?.S,
      author: data.Item.author?.S,
      publishYear: data.Item.publishYear?.N,
      createdAt: data.Item.createdAt?.S,
      updatedAt: data.Item.updatedAt?.S,
      imageUrl: data.Item.imageUrl?.S,
    };

    res.status(200).json(book);
  } catch (error) {
    console.log("Error fetching data from database", error);
    res.status(500).send({ message: error.message });
  }
};

// Controller for updating a book
export const updateBook = async (req, res) => {
  try {
    if (!req.body.title || !req.body.author || !req.body.publishYear) {
      console.log("ERROR");
    }

    console.log("UPDATE DATA:", req.body);
    console.log("FILE DATA:", req.file);

    const { id } = req.params;
    const file = req.file;

    let imageUrl = null;

    if (file) {
      const uploadParams = {
        Bucket: AWS_S3_BUCKET_NAME_BEFORE,
        Key: `${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(uploadParams);
      await s3.send(command);

      // Generate the S3 object URL
      imageUrl = `https://${AWS_S3_BUCKET_NAME_AFTER}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
      console.log("URL:", imageUrl);
    }

    const params = {
      TableName: "Books",
      Key: {
        id: { S: id },
      },
      UpdateExpression:
        "set title = :title, author = :author, publishYear = :publishYear, updatedAt = :updatedAt" +
        (imageUrl ? ", imageUrl = :imageUrl" : ""),
      ExpressionAttributeValues: {
        ":title": { S: req.body.title },
        ":author": { S: req.body.author },
        ":publishYear": { N: req.body.publishYear.toString() },
        ":updatedAt": { S: new Date().toISOString() },
        ...(imageUrl && { ":imageUrl": { S: imageUrl } }),
      },
    };

    const command = new UpdateItemCommand(params);
    const data = await client.send(command);

    if (!data.Attributes) {
      return res.status(404).json({ message: "Book not found!" });
    }

    res.status(200).json({ message: "Book updated successfully!" });
  } catch (error) {
    console.log("Error updating data in database", error);
    res.status(500).send({ message: error.message });
  }
};

// Controller for deleting a book
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("ID:", id);

    const params = {
      TableName: "Books",
      Key: {
        id: { S: id },
      },
    };

    const command = new DeleteItemCommand(params);
    const data = await client.send(command);

    if (!data.Attributes) {
      return res.status(404).json({ message: "Book not found!" });
    }

    res.status(200).json({ message: "Book deleted successfully!" });
  } catch (error) {
    console.log("Error deleting data from database", error);
    res.status(500).send({ message: error.message });
  }
};
