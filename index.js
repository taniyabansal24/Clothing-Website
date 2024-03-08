const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
import path from 'path';

app.use(express.json());
app.use(express.static(path.join(__dirname,'./frontend/build')))
app.use(cors());

app.use('*', function (req,res){
    res.sendFile(path.join(__dirname,"./frontend/build/index.html"));
} )

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://taniya1agarwal:WzzieoaMRbDKps8H@cluster0.rvyfveg.mongodb.net/e-commerce");

// API Creation

app.get("/",(req,res)=>{
    res.send("Express app is running")
})

// Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({storage:storage})

// Creating Upload Endpoint for images
app.use('/images', express.static(path.join(__dirname, 'upload/images')));


app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}` // Corrected URL path
    });
});



//Schema for creating products
const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true,
    },
    name:{
        type: String,
        required:true,
    },
    image:{
        type: String,
        required:true,
    },
    category:{
        type: String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type: Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct', async(req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id: id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for deleting product

app.post('/removeproduct', async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name
    })
})

// Creating API for geeting all products

app.get('/allproducts', async (req, res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Schema creating for User model

const User = mongoose.model('User', { // Change 'Users' to 'User'
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// Creating Endpoint for registering the user
app.post('/signup', async (req, res) => {

    let check = await User.findOne({ email: req.body.email }); // Change Users to User
    if (check) {
        return res.status(400).json({ success: false, error: "existing user found with same email address" })
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new User({ // Change Users to User
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token })
})

// Creating Endpoint for user login
app.post('/login', async (req, res) => {
    let user = await User.findOne({ email: req.body.email }); // Change Uses to User
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token });
        }
        else {
            res.json({ success: false, error: "Wrong Password" });
        }
    }
    else {
        res.json({ success: false, error: "Wrong  Email" });
    }
})

// Creating endpoint for popular in women section
app.get('/popularinwomen', async (req, res) => {
    try {
        let products = await Product.find({ category: "women" });
        if (products && products.length > 0) { // Check if products exist and have length
            let popular_in_women = products.slice(20, 24);
            console.log("Popular in women fetched");
            res.send(popular_in_women);
        } else {
            console.log("No products found in women category");
            res.status(404).send("No products found in women category");
        }
    } catch (error) {
        console.error("Error fetching popular products in women category:", error);
        res.status(500).send("Internal server error");
    }
})

// Creating endpoint for popular in men section
app.get('/popularinmen', async (req, res) => {
    try {
        let products = await Product.find({ category: "men" });
        if (products && products.length > 0) { // Check if products exist and have length
            let popular_in_men = products.slice(4, 8);
            console.log("Popular in men fetched");
            res.send(popular_in_men);
        } else {
            console.log("No products found in men category");
            res.status(404).send("No products found in men category");
        }
    } catch (error) {
        console.error("Error fetching popular products in men category:", error);
        res.status(500).send("Internal server error");
    }
})


// Creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using a valid token" });
    } else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ errors: "Please authenticate using a valid token" });
        }
    }
}


// Creating endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added", req.body.itemId);
    try {
        let userData = await User.findOne({ _id: req.user.id });
        userData.cartData[req.body.itemId] += 1;
        await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
        res.json({ success: true, message: "Item added to cart" }); // Return a JSON response
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ success: false, error: "Internal server error" }); // Return a JSON response
    }
});



// Creating endpoint to remove from cart data
express.application.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("Removed",req.body.itemId);
    let userData = await User.findOne({_id:req.user.id}); // Change Users to User
    if(userData.cartData[req.body.itemId]>0)
        userData.cartData[req.body.itemId] -= 1;
    await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData}); // Change Users to User
    res.send("Removed");
})

// Creating endpoint to get cartdata
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("GetCart");
    let userData = await User.findOne({_id:req.user.id}); // Change Users to User
    res.json(userData.cartData);
})

app.listen(port,(error)=>{
    if (!error){
        console.log("Server Running on Port "+port)
    }
    else{
        console.log("Error: "+error)
    }
})

