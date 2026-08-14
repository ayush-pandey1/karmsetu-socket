const PORT = process.env.PORT || 8800;

const io = require("socket.io")(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
});

console.log(`Socket.IO server running on port ${PORT}`);

let activeUsers = [];

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("new-user-add", (newUserId) => {
    if (!newUserId) return;
    
    // If user already exists with this or another socket, update the socketId
    const existingUserIndex = activeUsers.findIndex((user) => user.userId === newUserId);
    if (existingUserIndex !== -1) {
      activeUsers[existingUserIndex].socketId = socket.id;
    } else {
      activeUsers.push({ userId: newUserId, socketId: socket.id });
    }

    console.log("Active users after connect:", activeUsers);
    io.emit("get-users", activeUsers);
  });

  socket.on("disconnect", () => {
    activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
    console.log(`Socket disconnected: ${socket.id}`, activeUsers);
    io.emit("get-users", activeUsers);
  });

  socket.on("send-message", (data) => { 
    if (!data) return;
    const { receiverId } = data;
    console.log("Message sending to receiverId:", receiverId, "data:", data);
    
    const recipients = activeUsers.filter((user) => user.userId === receiverId);
    if (recipients.length > 0) {
      recipients.forEach((recipient) => {
        io.to(recipient.socketId).emit("recieve-message", data);
      });
      console.log(`Delivered message to ${recipients.length} socket(s) for user ${receiverId}`);
    } else {
      console.log(`User ${receiverId} is offline. Message saved in DB.`);
    }
  });
});

