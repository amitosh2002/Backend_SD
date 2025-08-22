import dotenv from 'dotenv';
dotenv.config();
export const dbConfig = {
  url: process.env.MONGODB_URI ,
    options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,   
    },
};
