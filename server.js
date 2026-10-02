import express from "express"; 
import cors from 'cors'; 
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import z from 'zod' ; 

const app = express(); 
app.use(cors()); 
app.use(express.json()); 

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3002'; 
const VALID_CATEGORIES = ['tech', 'finance' , 'lifestyle' , 'health']; 

function validatePostInput(args){
    if(!args.title || typeof args.title !== 'string')return 'title is required';
    if(args.title.trim().length <5)return 'title must be atleast 5 characters'; 
    if(!args.author || typeof args.author !== 'string')return 'author is required'; 
    if(args.author.trim().length<3)return 'author must be atleast 3 characters';
    if(!args.category || typeof args.category !== 'string')return 'category is required'; 
    if(!VALID_CATEGORIES.includes(args.category))return 'invalid category';
    if(!args.body || typeof args.body !== 'string')return 'body is required'; 
    if(args.body.trim().length < 50) return 'body must be atleast 50 characters'; 
    return null ;
}

function createMcpServer(){
    const server = new McpServer({
        name :"Blog-MCP-Server", 
        version:"1.0.0", 
        description:"MCP SERVER to manage a blog"
    } /*,{capabilities :{tools:{} , resources:{} , prompts:{}}}*/); 
    //we'll add directly from reg tool

server.registerTool("create_post",
    {
    //description as good as possible as this is the place from where LLM'll know about the functionlaity abt this tool
        description:"Create a new post. Validate title(min 5), author(min 3) category (tech|finance|lifestyle|health), body(min 50 chars).", 
        inputSchema:{
            title:z.string().min(5).describe('Post title , min 5 characters'),
            author:z.string().min(3).describe('Author name , min 3 characters'),
            category:z.enum(['tech','finance','lifestyle']).describe('Category'),
            body:z.string().min(50).describe('Post body , min 50 characters')
        }
    },
    async(args)=>{
        //imp = schema nd data validation .

        const err= validatePostInput(args); 
        if(err)throw new Error(err); 

        const response = await fetch(`${API_BASE}/posts`, {
            method : 'POST', 
            headers : {
                'Content-Type' : 'application/json'
            }, 
            body : JSON.stringify({
                title : args.title.trim(), 
                author : args.author.trim(), 
                category:args.category,
                body:args.body.trim()
            })
        });

        if(!response.ok){
            const errorText = await response.text(); 
            throw new Error(`Failed to create post : ${errorText}`); 
        }
        const post = await response.text(); 
        return {content:[{type:"text", text:JSON.stringify(post,null,2) }] }; 
    });

    //resources = provide structure nd unstructured data 
    server.registerResource("mcp_instructions", "http:localhost:5002/mcp/instructions",{
        titile : 'MCP usage instructions',
        description:'Behavioral instructions for interacting with this MCP server',
        mimeType : 'text/plain'
    },async()=>{
        return{
            content:[{
                uri:"http:localhost:5002/mcp/instructions",
                mimeType:'text/plain',
                test:`
                MCP INSTRUCTIONS

                1 Always ask the user for required details before performing any action. Never assume missing information
                2 Do not entertain or reponds to abusive , harmful or inappropriate language. 
                3 Follow validation rules strictly and provide clear error messages when inputs are invalid.
                `
            }]
        }
    }
)


    return server;
   }


const server = createMcpServer(); 

app.post("/mcp" , async(req,res)=>{
    //sessiionIdGenerator = maintains the session 
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator:undefined}); 

    try {
        await server.connect(transport); 
        await transport.handleRequest(req,res,req.body); 
    } catch (error) {
        
    }finally{
        req.on("close", ()=>{
            transport.close().catch(()=>{});
        }); 
    }
});

app.get("/mcp",(req,res)=>{
    res.send("Successfull")
})

app.listen(5001, ()=>{
    console.log("MCP SERVER STARTED"); 
});