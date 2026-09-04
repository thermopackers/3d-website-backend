// controllers/userController.js
import User from "../models/userModel.js";

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) {
      updateData.address = {
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        zipCode: address.zipCode || "",
        country: address.country || "India",
        landmark: address.landmark || ""
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// Add new address
export const addAddress = async (req, res) => {
  try {
    let { label, name, phone, street, city, state, zipCode, country, landmark, isDefault } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate required fields
    if (!street || !city || !state || !zipCode) {
      return res.status(400).json({ 
        error: "Street, city, state, and zip code are required" 
      });
    }

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // If no default exists and this is the first address, make it default
    let shouldBeDefault = isDefault || false;
    if (user.addresses.length === 0) {
      shouldBeDefault = true;
    }

    user.addresses.push({
      label: label || 'Home',
      name: name || user.name,
      phone: phone || user.phone || '',
      street,
      city,
      state,
      zipCode,
      country: country || "India",
      landmark: landmark || "",
      isDefault: shouldBeDefault
    });

    await user.save();
    
    // Get updated user with addresses
    const updatedUser = await User.findById(req.user.id).select("addresses");
    
    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: updatedUser.addresses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add address" });
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, name, phone, street, city, state, zipCode, country, landmark, isDefault } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // Update address
    const address = user.addresses[addressIndex];
    if (label) address.label = label;
    if (name) address.name = name;
    if (phone) address.phone = phone;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zipCode) address.zipCode = zipCode;
    if (country) address.country = country;
    if (landmark !== undefined) address.landmark = landmark;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();
    
    res.json({
      success: true,
      message: "Address updated successfully",
      addresses: user.addresses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update address" });
  }
};

// Update user address only (for backward compatibility)
export const updateUserAddress = async (req, res) => {
  try {
    const { street, city, state, zipCode, country, landmark } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        address: {
          street: street || "",
          city: city || "",
          state: state || "",
          zipCode: zipCode || "",
          country: country || "India",
          landmark: landmark || ""
        }
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "Address updated successfully",
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update address" });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Check if trying to delete default address
    const isDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default and there are other addresses, make the first one default
    if (isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    
    res.json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.addresses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete address" });
  }
};

// Set default address
export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove default from all addresses
    user.addresses.forEach(addr => addr.isDefault = false);
    
    // Set the selected address as default
    const address = user.addresses.find(addr => addr._id.toString() === addressId);
    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }
    address.isDefault = true;

    await user.save();
    
    res.json({
      success: true,
      message: "Default address set successfully",
      addresses: user.addresses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set default address" });
  }
};

// Get all addresses
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      success: true,
      addresses: user.addresses || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
};

// Get user address for auto-fill
export const getUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("address phone name email addresses");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get default address or first address
    const defaultAddress = user.addresses?.find(addr => addr.isDefault) || user.addresses?.[0] || null;
    
    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "India",
          landmark: ""
        },
        addresses: user.addresses || []
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user address" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get user statistics (admin only)
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const suspendedUsers = await User.countDocuments({ status: "suspended" });
    const admins = await User.countDocuments({ role: "admin" });
    
    // Get users created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        admins,
        newUsersThisMonth
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// Update user status (admin only)
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user status" });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user role" });
  }
};

// Update user by admin
export const updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, role, status, address } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (address) updateData.address = address;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      message: "User updated successfully",
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
};