// controllers/orderController.js
import Order from "../models/orderModel.js";

// Place an order
export const createOrder = async (req, res) => {
  try {
    const { product, quantity, color, material, shippingDetails } = req.body;
    
    const order = await Order.create({
      user: req.user.id,
      product,
      quantity,
      color,
      material,
      shippingDetails: shippingDetails || {},
      status: "Pending",
      statusHistory: [
        {
          status: "Pending",
          note: "Order placed successfully",
          timestamp: new Date()
        }
      ]
    });
    
    // Populate product details
    const populatedOrder = await Order.findById(order._id).populate("product");
    
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: populatedOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
};

// Bulk order creation
export const createBulkOrders = async (req, res) => {
  try {
    const { orders, shippingDetails } = req.body;
    
    const savedOrders = await Order.insertMany(
      orders.map(o => ({
        ...o,
        user: req.user.id,
        status: "Pending",
        statusHistory: [
          {
            status: "Pending",
            note: "Order placed successfully",
            timestamp: new Date()
          }
        ],
        shippingDetails: shippingDetails || {}
      }))
    );
    
    // Populate product details
    const populatedOrders = await Order.find({ _id: { $in: savedOrders.map(o => o._id) } })
      .populate("product");
    
    res.status(201).json({
      success: true,
      message: "Orders placed successfully",
      orders: populatedOrders
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to place orders" });
  }
};

// Update order status with history
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note, location } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Update status
    order.status = status;
    
    // Add to status history
    order.statusHistory.push({
      status,
      note: note || `Order status updated to ${status}`,
      location: location || "",
      timestamp: new Date(),
      updatedBy: req.user.id
    });
    
    // If status is Shipped or Out for Delivery, set estimated delivery
    if (status === "Shipped" || status === "Out for Delivery") {
      const deliveryDays = status === "Shipped" ? 3 : 1;
      order.estimatedDelivery = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);
    }
    
    await order.save();
    
    const populatedOrder = await Order.findById(orderId).populate("product");
    
    res.json({
      success: true,
      message: "Order status updated successfully",
      order: populatedOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

// Add tracking number
export const addTrackingNumber = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      orderId,
      { trackingNumber },
      { new: true }
    ).populate("product");
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
      success: true,
      message: "Tracking number added successfully",
      order
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add tracking number" });
  }
};

// Get order with status history
export const getOrderWithHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id
    }).populate("product");
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

// Get all orders for user
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("product")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// Admin: Update order status
export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note, location } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Validate status transition
    const validTransitions = {
      'Pending': ['Processing', 'Cancelled'],
      'Processing': ['Shipped', 'Cancelled'],
      'Shipped': ['Out for Delivery', 'Delivered', 'Cancelled'],
      'Out for Delivery': ['Delivered', 'Cancelled'],
      'Delivered': [],
      'Cancelled': []
    };
    
    if (!validTransitions[order.status]?.includes(status) && order.status !== status) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${order.status} to ${status}` 
      });
    }
    
    // Update status
    order.status = status;
    order.statusHistory.push({
      status,
      note: note || `Order status updated to ${status}`,
      location: location || "",
      timestamp: new Date(),
      updatedBy: req.user.id
    });
    
    // Set estimated delivery
    if (status === "Shipped") {
      order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (status === "Out for Delivery") {
      order.estimatedDelivery = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    } else if (status === "Delivered") {
      order.estimatedDelivery = new Date();
    }
    
    await order.save();
    
    // Send notification (you can integrate with email/SMS service)
    // await sendStatusUpdateNotification(order);
    
    const populatedOrder = await Order.findById(orderId).populate("product");
    
    res.json({
      success: true,
      message: "Order status updated successfully",
      order: populatedOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
};