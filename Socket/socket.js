import { Server } from "socket.io";
let io ;
export const initSocket =(server)=>{
    io= new Server(server,{
        cors:{
            origin:"*",
            methods:["GET","POST"],
            credentials:true
        }
    })

    io.on("connection",(socket)=>{
        console.log("a user connected",socket.id);

        socket.on('join',(userId)=>{
            const room = String(userId);
            socket.join(room);
            console.log('user joined the server', room);
        })

        socket.on('user:online', (userId) => {
            const room = String(userId);
            socket.join(room);
            console.log('user connected (online)', room);
        });

        socket.on('notify',(userId,message)=>{
            io.to(userId).emit('notification',{
                message:message,
                time:new Date().toISOString()
            })
        })

        socket.on('disconnect',()=>{
            console.log("user disconnected",socket.id);
        })
    })
}


// get id 

export const getIO =()=>{
    if (!io) {
        throw new Error("Socket not initialized");
    }
    return io;
}