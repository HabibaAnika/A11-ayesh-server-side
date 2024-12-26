const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express()


const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://a-11-ayesh.web.app',
    'https://a-11-ayesh.firebaseapp.com'
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err)
        return res.status(401).send({ message: 'unauthorized access' })
      }
      // console.log(decoded)

      req.user = decoded
      next()
    })
  }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uurflxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookeOption={
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' ? true : false,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
}

async function run() {
  try {
    const foodCollection = client.db('ayesh').collection('food')
    const requestCollection = client.db('ayesh').collection('request');
    
    // jwt generate
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, cookeOption)
        .send({ success: true })
    })

    // Clear token on logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          ...cookeOption,
          maxAge: 0,
        })
        .send({ success: true })
    })




    // Get all jobs data from db
    app.get('/foods', async (req, res) => {
      const result = await foodCollection.find().toArray()
      res.send(result)
    })


    // Get a single food data from db using food id
    app.get('/food/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query)
      res.send(result)
    })

    // Save a req data in db
    app.post('/req', async (req, res) => {
      const reqData = req.body
      const result = await requestCollection.insertOne(reqData)

      // update req count in food Collection
      const updateDoc = {
        $inc: { req_count: 1 },
      }
      const foodQuery = { _id: new ObjectId(reqData.foodId) }
      const updateReqCount = await foodCollection.updateOne(foodQuery, updateDoc)
      // console.log(updateReqCount)
      res.send(result)
    })

    
    // delete a food data from db
    app.delete('/food/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.deleteOne(query)
      res.send(result)
    })
    

     // Get all foods added by the logged-in user (My Food)
    app.get('/my-foods/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'Donator.email': email };
      try {
        const result = await foodCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching foods:', error);
        res.status(500).send('Error fetching foods');
      }
    });

    //Get all food requests from db for  (My-Food-Req)
      app.get('/my-req/:email', async (req, res) => {
        const email = req.params.email
        // console.log('Fetching food requests for email:', email); 
        const query = { 'Donator.email': email }
        const result = await requestCollection.find(query).toArray()
        // console.log('Fetched food requests:', result); 
        res.send(result)
      })



    // Save a food data in db
    app.post('/food', async (req, res) => {
      const foodData = req.body
      const result = await foodCollection.insertOne(foodData)
      res.send(result)
    })

   
    // Get all food data from db for search, sort, 
    app.get('/all-foods', async (req, res) => {
      
      const sort = req.query.sort
      const search = req.query.search

      let query = {
        FoodName: { $regex: search, $options: 'i' },
      }
      
      let options = {} ;
      if (sort) options = { sort: { ExpiredDateTime: sort === 'asc' ? 1 : -1 } }
      const result = await foodCollection
        .find(query, options)
        .toArray()
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello from Ayesh Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))