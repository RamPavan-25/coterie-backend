const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var mysql=require("mysql");
const cors=require("cors");
const app = express();
require("dotenv").config()

app.use(cors());
app.use(express.json());

var db=mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database
})

db.connect(function(error){
	if(!!error) {
		console.log(error);
	} else {
		console.log('Database Connected Successfully..!!');
	}
});

const port = process.env.PORT || 9001;

app.listen(port, () =>
      console.log("Server Running at http://localhost:8000/")
);

app.get("/",async (request,response)=>{
    const q=`SELECT * FROM Login`;
    db.query(q,(err,data)=>{
        if(err)return response.json(err);
        return response.json(data);
    })
})

app.post("/",async (request,response)=>{
    const {username,password}=request.body;
    const q=`SELECT * FROM Login WHERE Username='${username}'`;
    let wanted={isuservalid:true,ispasswordvalid:true,jwt_token:""};
    db.query(q,async(err,data)=>{
        if(err)return response.json(err);
        if(data.length==0)
        {
            wanted.isuservalid=false;
            wanted.ispasswordvalid=false;
            return response.json(wanted);
        }
        const hashedPassword=data[0].UserPassword;
        const isPasswordMatched = await bcrypt.compare(password,hashedPassword);
        if(isPasswordMatched===false)
        {
            wanted.isuservalid=true;
            wanted.ispasswordvalid=false;
            return response.json(wanted);
        }
        else
        {
            const payload = {
                username: username,
              };
              const jwtToken = jwt.sign(payload, process.env.secret_token);
              wanted.jwt_token=jwtToken;
            return response.json(wanted);
        }
    })
})

app.post("/sign-up",async (request,response)=>{
    const {username,password}=request.body;
    const q=`SELECT * FROM Login WHERE Username='${username}'`;
    let newpassword=password.toString();
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    let wanted={isuservalid:false};
    db.query(q,(err,data)=>{
        if(err)return response.json(err);
        if(data.length==0)
        {
            const createUserQuery = `
            INSERT INTO 
            login (Username,UserPassword) 
            VALUES 
            (
                '${username}', 
                '${hashedPassword}'
            )`;
            db.query(createUserQuery,(err,data)=>{
                if(err)return response.json(err);
                else
                {
                    wanted.isuservalid=true;
                    return response.json(wanted);
                }
            })
        }
        else
        {
            return response.json(wanted);
        }
    }
    )
})

app.delete("/",async (request,response)=>{
    const q=`DELETE FROM Login`;
    db.query(q,(err,data)=>{
        if(err)return response.json(err);
        return response.json(data);
    })
})

app.post("/products",async (request,response)=>{
    const{order_by,category,searchInput,rating}=request.body;
    const q=`SELECT * FROM product WHERE rating>=${rating} AND category LIKE '${category}%' AND title LIKE '${searchInput}%' ORDER BY PRICE ${order_by} `;
    db.query(q,(err,data)=>{
        if(err)return response.json(err);
        return response.json(data);
    })
})

app.get("/products/:id",async (request,response)=>{
    const {id}=request.params;
    const q=`SELECT * FROM product WHERE id=${id} `;
    db.query(q,(err,data)=>{
        if(err)return response.json(err);
        else
        {
            let x=data[0];
            const similarquery=`SELECT * FROM product WHERE id!=${id} AND category='${x["category"]}' LIMIT 3`;
            db.query(similarquery,(error,got)=>{
                if(err)return response.json(error);
                else
                {
                    let ans={data:data,got:got};
                    return response.json(ans);
                }
            })
        }
    })
})
