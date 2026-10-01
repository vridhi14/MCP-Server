import express from "express"; 
import cors from 'cors'; 
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

const app = express(); 
app.use(cors()); 

function createMcpServer(){
    const server = new McpServer({
        name :"Blog-MCP-Server", 
        version:"1.0.0", 
        description:"MCP SERVER to manage a blog"
    } , {capabilities :{tools:{} , resources:{} , prompts:{}}});
    return server;
}

app.post("/mcp" , async(req,res)=>{
    const server = createMcpServer(); 
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator:undefined}); 

    try {
        await server.connect(transport); 
        await transport.handleRequest(req,res,req.body); 
    } catch (error) {
        
    }finally{
        req.on("close", ()=>{
            transport.close().catch(()=>{});
            server.close().catch(()=>{});
        }); 
    }
});

app.listen(5001, ()=>{
    console.log("MCP SERVER STARTED"); 
});