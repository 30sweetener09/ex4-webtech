const dotenv = require('dotenv');
dotenv.config({quiet: true});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB Error:", err));

//Tạo Schema
const UserSchema = new mongoose.Schema({ 
    name: { type: String, required: [true, 'Tên không được để trống'], minlength: [2, 'Tên phải có ít nhất 2 ký tự'] },
    age: { type: Number, required: [true, 'Tuổi không được để trống'], min: [0, 'Tuổi phải là số dương'] },
    email: { type: String, required: [true, 'Email không được để trống'], match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'], unique: true },
    address: { type: String, required: false }
 });
const User = mongoose.model("User", UserSchema);

// API endpoints
// GET: /api/users?page=1&limit=5&search=nguyen
app.get("/api/users", async (req, res) => {
    try {
        //page và limit phải là số nguyên dương
        if (req.query.page && (!Number.isInteger(parseInt(req.query.page)) || parseInt(req.query.page) <= 0)) {
            return res.status(400).json({ error: "Tham số page phải là số nguyên dương" });
        }
        if (req.query.limit && (!Number.isInteger(parseInt(req.query.limit)) || parseInt(req.query.limit) <= 0)) {
            return res.status(400).json({ error: "Tham số limit phải là số nguyên dương" });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        
        const filter = search ? {
            $or: [
                {name: { $regex: search, $options: "i" }},
                {email: { $regex: search, $options: "i" }},
                {address: { $regex: search, $options: "i" }}
            ]
        } : {};
        const skip = (page - 1) * limit;

        const users = await User.find(filter).skip(skip).limit(limit);
        const total = await User.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);
        res.json({ page, limit, total, totalPages, data: users });
    } catch (err) {
        //Xử lí lỗi 400, 500
        //400: Lỗi do client gửi dữ liệu không hợp lệ
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }
        //500: Lỗi server
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
});
app.post("/api/users", async (req, res) => {
    try {
        const { name, age, email, address } = req.body;
        const newUser = await User.create({ name, age, email, address });

        //Trùng email:
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Email này đã được sử dụng bởi người khác!" 
            });
        }
        res.status(201).json({ 
            success: true,
            message: "Người dùng đã được tạo thành công",
            data: newUser
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
});
app.put("/api/users/:id", async (req, res) => { 
    try {
        const { id } = req.params;
        const { name, age, email, address } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { name, age, email, address },
            { new: true, runValidators: true }
        );
        if (!updatedUser) {
            return res.status(404).json({ error: "Người dùng không tồn tại" });
        }
        res.json({ 
            message: "Cập nhật người dùng thành công",
            data: updatedUser
        });
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Lỗi máy chủ" });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ error: "Người dùng không tồn tại" });
        }
        res.json({ message: "Xóa người dùng thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get("/api", (req, res) => {
    res.json({ message: "API đang hoạt động" });
});

// Start server
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running on http://localhost:" + (process.env.PORT || 3000));
});