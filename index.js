import dotenv from "dotenv";
dotenv.config();

import e from "express";
import { connection, collectionName } from "./dbconfig.js";
import cors from "cors";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import cookieParser from "cookie-parser";
// import "dotenv/config";

const app = e();
app.use(e.json());
app.use(cors(
  {
   origin: [
    "http://localhost:5173",
    "https://todo-frontend-two-blond.vercel.app"
  ],
  credentials:true
} 
))
app.use(cookieParser());

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.post("/signup", async (req, res) => {
  // STEP 1.1 (tum already kar chuke ho)
   let { name, email, password } = req.body;

  name = name?.trim();
  email = email?.trim().toLowerCase();
  password = password?.trim();

    // STEP 1.2: Empty field validation
  if (!name) {
    return res.send({ success: false, message: "Name is required" });
  }
  // Name minimum length
if (name.length < 3) {
  return res.send({
    success: false,
    message: "Name must be at least 3 characters"
  });
}

// Only letters + space allowed
const nameRegex = /^[A-Za-z ]+$/;
if (!nameRegex.test(name)) {
  return res.send({
    success: false,
    message: "Name can contain only letters"
  });
}


  if (!email) {
    return res.send({ success: false, message: "Email is required" });
  }

  if (!password) {
    return res.send({ success: false, message: "Password is required" });
  }
  // STEP 1.3: Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.send({
      success: false,
      message: "Invalid email format"
    });
  }

  // STEP 1.3: Only gmail allowed
  if (!email.endsWith("@gmail.com")) {
    return res.send({
      success: false,
      message: "Only @gmail.com email is allowed"
    });
  }
   const db = await connection();
  const collection = await db.collection("users");

  const existingUser = await collection.findOne({ email });

  if (existingUser) {
    return res.send({
      success: false,
      message: "Email already registered"
    });
  }

  // Minimum length check
if (password.length < 6) {
  return res.send({
    success: false,
    message: "Password must be at least 6 characters long"
  });
}

// Strong password pattern
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/;

if (!passwordRegex.test(password)) {
  return res.send({
    success: false,
    message:
      "Password must contain uppercase, lowercase, number and special character"
  });
}
  //const userData = req.body;
  //if (userData.email && userData.password) {
    // const db = await connection();
    // const collection = await db.collection("users");
    //const result = await collection.insertOne(userData);
    // STEP 1.6.2: Hash password before saving
const hashedPassword = await bcrypt.hash(password, 10);

const result = await collection.insertOne({
  name,
  email,
  password: hashedPassword
});

    if (result) {
      jwt.sign({email,name}, "Google", { expiresIn: "5d" }, (err, token) => {
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
          httpOnly: true,
          secure: isProd,
          sameSite: isProd ? "none" : "lax"
});

//         res.cookie("token", token, {
//   httpOnly: true,
//   sameSite: "none",
//   secure: true

// });

        res.send({
          success: true,
          message: "User signed up successfully",
          //token,
        });
      });
    }
  // } else {
  //   res.send({
  //     success: false,
  //     message: "signupnote done",
  //   });
  // }
  // res.send("Api in progress");
});





app.post("/login", async (req, res) => {
  const userData = req.body;
  if (userData.email && userData.password) {
    const db = await connection();
    const collection = await db.collection("users");
    // const result = await collection.findOne({
    //   email: userData.email,
    //   password: userData.password,
    // });
    const result = await collection.findOne({ email: userData.email });

if (!result) {
  return res.send({
    success: false,
    message: "user not found",
  });
}

// Compare entered password with hashed password
const isMatch = await bcrypt.compare(userData.password, result.password);

if (!isMatch) {
  return res.send({
    success: false,
    message: "Invalid password",
  });
}
jwt.sign(
  { email: result.email, name: result.name },  // safer data
  "Google",
  { expiresIn: "5d" },
  (err, token) => {

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax"
    });

    res.send({
      success: true,
      message: "Login successful"
    });
  }
);


//     if (result) {
//       jwt.sign(userData, "Google", { expiresIn: "5d" }, (err, token) => {
//         const isProd = process.env.NODE_ENV === "production";

// res.cookie("token", token, {
//   httpOnly: true,
//   secure: isProd,
//   sameSite: isProd ? "none" : "lax"
// });

        // res.cookie("token", token, {
        //  httpOnly: true,
        //   sameSite: "none",
        //   secure: true

        // });

    //     res.send({
    //       success: true,
    //       message: "Login successful",
    //       //token,
    //     });
    //   });
    // } else {
    //   res.send({
    //     success: false,
    //     message: "user not found",
    //   });
    // }
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


// app.post("/logout", (req, res) => {
//   res.clearCookie("token");
//   res.send({ success: true, message: "Logged out" });
// });

// app.post("/logout", (req, res) => {
//   res.clearCookie("token", {
//     httpOnly: true,
//     sameSite: "none",
//     secure: true
//   });
//   res.send({ success: true, message: "Logged out" });
// });
const isProd = process.env.NODE_ENV === "production";

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax"
  });
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

