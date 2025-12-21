import e from "express";
import { connection, collectionName } from "./dbconfig.js";
import cors from "cors";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const app = e();
app.use(e.json());
app.use(cors(
  {
  origin:'http://localhost:5173',
  credentials:true
} 
))
app.use(cookieParser());

app.post("/signup", async (req, res) => {
  const userData = req.body;
  if (userData.email && userData.password) {
    const db = await connection();
    const collection = await db.collection("users");
    const result = await collection.insertOne(userData);
    if (result) {
      jwt.sign(userData, "Google", { expiresIn: "5d" }, (err, token) => {
        res.cookie("token", token, {
  httpOnly: true,
  sameSite: "lax",
  secure: false

});

        res.send({
          success: true,
          message: "User signed up successfully",
          //token,
        });
      });
    }
  } else {
    res.send({
      success: false,
      message: "signupnote done",
    });
  }
  // res.send("Api in progress");
});

app.post("/login", async (req, res) => {
  const userData = req.body;
  if (userData.email && userData.password) {
    const db = await connection();
    const collection = await db.collection("users");
    const result = await collection.findOne({
      email: userData.email,
      password: userData.password,
    });
    if (result) {
      jwt.sign(userData, "Google", { expiresIn: "5d" }, (err, token) => {
        res.cookie("token", token, {
         httpOnly: true,
          sameSite: "lax",
          secure: false

        });

        res.send({
          success: true,
          message: "Login successful",
          //token,
        });
      });
    } else {
      res.send({
        success: false,
        message: "user not found",
      });
    }
  } else {
    res.send({
      success: false,
      message: "login not done",
    });
  }
  // res.send("Api in progress");
});

app.post("/add-task",verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const taskData = {
  ...req.body,
  userEmail: req.user.email
};

  const result = await collection.insertOne(taskData);
  if (result) {
    res.send({ message: "new task added", success: true, result });
  } else {
    res.send({ message: "task not added", success: false });
  }
});

app.get("/tasks",verifyJWTToken, async (req, res) => {
  const db = await connection();
  // console.log("cookie test",req.cookies['token']);
  const collection = await db.collection(collectionName);
  // const result = await collection.find().toArray();
  const result = await collection.find({
  userEmail: req.user.email
}).toArray();

  if (result) {
    res.send({ message: "Task list fetched", success: true, result });
  } else {
    res.send({ message: "Error try after sometime.", success: false });
  }
});





app.get("/task/:id",verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const id = req.params.id;
  const result = await collection.findOne({ _id: new ObjectId(id) });
  if (result) {
    res.send({ message: "Task fetched", success: true, result });
  } else {
    res.send({ message: "Error try after sometime.", success: false });
  }
});

app.put("/update-task",verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const { _id, ...fields } = req.body;
  const update = { $set: fields };
  console.log(fields);
  const result = await collection.updateOne({ _id: new ObjectId(_id) }, update);
  if (result) {
    res.send({ message: "Task data updated", success: true, result });
  } else {
    res.send({ message: "Error try after sometime.", success: false });
  }
});

app.delete("/delete/:id",verifyJWTToken, async (req, res) => {
  const db = await connection();
  const id = req.params.id;
  const collection = await db.collection(collectionName);
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  if (result) {
    res.send({ message: "Task deleted", success: true, result });
  } else {
    res.send({ message: "Error try after sometime.", success: false });
  }
});

app.delete("/delete-multiple",verifyJWTToken, async (req, res) => {
  const db = await connection();
  const Ids = req.body;
  const deleteTaskIds = Ids.map((item) => new ObjectId(item));
  console.log(Ids);

  const collection = await db.collection(collectionName);
  const result = await collection.deleteMany({ _id: { $in: deleteTaskIds } });
  if (result) {
    res.send({ message: "Task deleted", success: result });
  } else {
    res.send({ message: "Error try after sometime.", success: false });
  }
});

// app.get('/', (req, res) => {
//   res.send({
//     message: "Basic api done",
//     sucess: true
//   })
// })


app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.send({ success: true, message: "Logged out" });
});


function verifyJWTToken(req,res,next){
  //console.log("verifyJWTToken",req.cookies['token']);
  const token=req.cookies['token'];
  if (!token) {
  return res.send({ message: "Token missing", success: false });
}
  jwt.verify(token,"Google",(err,decoded)=>{
    if(err){
      return res.send({message:"Invalid token",success:false})

    }
    //console.log(decoded);
    req.user = decoded

     next()
  })
}

app.get("/check-auth", verifyJWTToken, (req, res) => {
  res.send({
    success: true,
    user: req.user
  });
});

app.listen(process.env.PORT || 3200);

