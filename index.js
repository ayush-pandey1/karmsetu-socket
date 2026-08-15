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

  // Event when freelancer submits an application for a client's project
  socket.on("send-application", (data) => {
    if (!data || !data.clientId) return;
    console.log("New application received for client:", data.clientId, data);
    const recipients = activeUsers.filter((user) => user.userId === data.clientId);
    if (recipients.length > 0) {
      recipients.forEach((recipient) => {
        io.to(recipient.socketId).emit("recieve-application", data);
      });
      console.log(`Notified ${recipients.length} client socket(s) of new application`);
    } else {
      console.log(`Client ${data.clientId} is currently offline`);
    }
  });

  // Event when client accepts or rejects an application
  socket.on("send-application-status", (data) => {
    if (!data || !data.freelancerId) return;
    console.log("Application status update for freelancer:", data.freelancerId, data);
    const recipients = activeUsers.filter((user) => user.userId === data.freelancerId);
    if (recipients.length > 0) {
      recipients.forEach((recipient) => {
        io.to(recipient.socketId).emit("recieve-application-status", data);
      });
      console.log(`Notified ${recipients.length} freelancer socket(s) of application status: ${data.status}`);
    } else {
      console.log(`Freelancer ${data.freelancerId} is currently offline`);
    }
  });
});


