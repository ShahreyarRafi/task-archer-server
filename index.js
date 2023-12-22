const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


//middleware
app.use(cors('*'));
// app.use(cors({
//   //local
//   // origin: ['http://localhost:5173'],
//   //live site
//   origin: [
//     'https://campus-cuisine.web.app/',
//     'https://campus-cuisine.firebaseapp.com/'
//   ],
//   credentials: true,
// }));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n8c8sym.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)


    const tasksCollection = client.db('TaskArcher').collection('TasksDB');
    const userCollection = client.db('TaskArcher').collection('UserDB')
    const mealRequestCollection = client.db('TaskArcher').collection('MealRequestDB')


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // for tasks

    app.get('/tasks', async (req, res) => {
      const cursor = tasksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await tasksCollection.findOne(query);
      res.send(result);
    })

    app.post('/tasks/post', async (req, res) => {
      const newTasks = req.body;
      console.log(newTasks);
      const result = await tasksCollection.insertOne(newTasks);
      console.log(result);
      res.send(result);
    })


    app.delete('/tasks/:taskId', async (req, res) => {
      const taskId = req.params.taskId;

      try {
        // Convert taskId to ObjectId
        const taskObjectId = new ObjectId(taskId);

        // Find the meal with the specified ID and delete it
        const result = await tasksCollection.deleteOne({ _id: taskObjectId });

        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'Task deleted successfully' });
        } else {
          res.status(404).json({ message: 'Task not found' });
        }
      } catch (error) {
        console.error('Error deleting Task:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.put('/tasks/:id', async (req, res) => {
      const { id } = req.params;
      const updatedTask = req.body;

      try {
        await client.connect();

        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedTask }
        );

        if (result.modifiedCount > 0) {
          res.json({ updated: true });
          console.log(updatedTask);
        } else {
          res.json({ updated: false });
        }
      } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.get('/:meal_status', async (req, res) => {
      const mealStatus = req.params.meal_status;
      const query = { meal_status: mealStatus };
      const results = await tasksCollection.find(query).toArray();
      res.send(results);
    });


    
    // ends here

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
})