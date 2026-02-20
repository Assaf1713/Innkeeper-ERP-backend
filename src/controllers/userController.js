const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Employee = require("../models/Employee");

// POST /api/users
// Creates a user linked to an existing employee
exports.createUser = async (req, res) => {
	try {
		const { username, password, role = "BASIC", employeeId } = req.body;

		if (!username || !password || !employeeId) {
			return res.status(400).json({ error: "username, password and employeeId are required" });
		}

		if (!mongoose.Types.ObjectId.isValid(employeeId)) {
			return res.status(400).json({ error: "Invalid employeeId" });
		}

		const employee = await Employee.findById(employeeId);
		if (!employee) {
			return res.status(404).json({ error: "Employee not found" });
		}

		const existingUserByUsername = await User.findOne({ username: username.trim() });
		if (existingUserByUsername) {
			return res.status(409).json({ error: "Username already exists" });
		}

		const existingUserByEmployee = await User.findOne({ employee: employeeId });
		if (existingUserByEmployee) {
			return res.status(409).json({ error: "This employee already has a user" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const user = await User.create({
			username: username.trim(),
			password: hashedPassword,
			role,
			employee: employeeId,
		});

		res.status(201).json({
			message: "User created successfully",
			user: {
				_id: user._id,
				username: user.username,
				role: user.role,
				employee: user.employee,
				isActive: user.isActive,
			},
		});
	} catch (error) {
		console.error("Error creating user:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// PATCH /api/users/:id/password
// BASIC can change only their own password (with currentPassword)
// ADMIN/SUPER_ADMIN can change any user's password
exports.changePassword = async (req, res) => {
	try {
		const { id } = req.params;
		const { currentPassword, newPassword } = req.body;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}

		if (!newPassword) {
			return res.status(400).json({ error: "newPassword is required" });
		}

		if (String(newPassword).length < 6) {
			return res.status(400).json({ error: "newPassword must be at least 6 characters" });
		}

		const targetUser = await User.findById(id);
		if (!targetUser) {
			return res.status(404).json({ error: "User not found" });
		}

		const isSelf = req.user && String(req.user.id) === String(id);
		const isAdmin = req.user && ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);

		if (!isSelf && !isAdmin) {
			return res.status(403).json({ error: "Access denied. Insufficient permissions." });
		}

		if (isSelf) {
			if (!currentPassword) {
				return res.status(400).json({ error: "currentPassword is required" });
			}

			const isMatch = await bcrypt.compare(currentPassword, targetUser.password);
			if (!isMatch) {
				return res.status(401).json({ error: "Current password is incorrect" });
			}
		}

		const salt = await bcrypt.genSalt(10);
		targetUser.password = await bcrypt.hash(newPassword, salt);
		await targetUser.save();

		res.json({ message: "Password changed successfully" });
	} catch (error) {
		console.error("Error changing password:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

exports.updateUser = async (req, res) => {
	try {
		const { id } = req.params;
		const { username, role, password } = req.body;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}

		const user = await User.findById(id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const updateData = {};

		if (username !== undefined) {
			const normalizedUsername = String(username).trim();
			if (!normalizedUsername) {
				return res.status(400).json({ error: "username is required" });
			}

			const existingUser = await User.findOne({
				username: normalizedUsername,
				_id: { $ne: id },
			});

			if (existingUser) {
				return res.status(409).json({ error: "Username already exists" });
			}

			updateData.username = normalizedUsername;
		}

		if (role !== undefined) {
			const allowedRoles = ["BASIC", "ADMIN", "SUPER_ADMIN"];
			if (!allowedRoles.includes(role)) {
				return res.status(400).json({ error: "Invalid role" });
			}
			updateData.role = role;
		}

		if (password !== undefined && String(password).trim() !== "") {
			if (String(password).length < 6) {
				return res.status(400).json({ error: "password must be at least 6 characters" });
			}
			const salt = await bcrypt.genSalt(10);
			updateData.password = await bcrypt.hash(password, salt);
		}

		if (!Object.keys(updateData).length) {
			return res.status(400).json({ error: "No valid fields to update" });
		}

		const updatedUser = await User.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true,
			select: "_id username role employee isActive",
		});

		return res.json({ user: updatedUser });
	} catch (error) {
		console.error("Error updating user:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};


exports.getUserbyEmployeeID = async (req, res) => {
    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ error: "Invalid employeeId" });
    }
    const user = await User.findOne({ employee: employeeId });
    if (!user) {
        return res.json({ user: null });
    }
    return res.json({ user });
};
