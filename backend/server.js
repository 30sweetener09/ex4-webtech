const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
// Middleware
app.use(cors());
app.use(express.json());

mongoose
.connect("mongodb+srv://20224913:20224913@it4409.ajy8kd9.mongodb.net/?appName=it4409")
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB Error:", err));

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên không được để trống'],
        minlength: [2, 'Tên phải có ít nhất 2 ký tự']
    },
    age: {
        type: Number,
        required: [true, 'Tuổi không được để trống'],
        min: [0, 'Tuổi phải >= 0']
    },
    email: {
        type: String,
        required: [true, 'Email không được để trống'],
        match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
    },
    address: {
        type: String
    }
});

const User = mongoose.model("User", UserSchema);

app.get("/api/users", async (req, res) => {
    try {
        // Lấy query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || "";
        // Tạo query filter cho search
        const filter = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } }
                ]
            }
            : {};
        // Tính skip
        const skip = (page - 1) * limit;
        // Query database
        const [users, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit),
            User.countDocuments(filter)
        ]);
        // Trả về response
        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: users
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/users", async (req, res) => {
    try {
        const { name, age, email, address } = req.body;
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({
                error: "Email đã tồn tại trong database"
            });
        }

        // Tạo user mới
        const newUser = await User.create({ name, age, email, address });
        res.status(201).json({
            message: "Tạo người dùng thành công",
            data: newUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
    });

app.put("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, email, address } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { name, age, email, address },
            { new: true, runValidators: true } // Quan trọng
        );
        if (!updatedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({
            message: "Cập nhật người dùng thành công",
            data: updatedUser
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({ message: "Xóa người dùng thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});