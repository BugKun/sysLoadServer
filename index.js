var express = require("express"),
    compress = require("compression"),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    os = require("os"),
    osUtils = require("os-utils"),
    path = require('path'),
    interval = -1,
    currCPU = 0,
    cpuInfo = "CPU：" + os.cpus()[0].model.replace(/(^\s*)|(\s*$)/g, "") + " @" + os.cpus()[0].speed + "Mhz ×" + os.cpus().length;

app.use(compress());
app.use(express.static(path.join(__dirname, '/static')));



/*可修改的设置*/
var Token = "abcd", //Token验证的字符串
    port = 8080; //服务器绑定的端口






server.listen(port);
console.log("Server is now running in localhost: " + port);

function Client(socket) {
    var self = this;
    this.socket = socket;
    this.timeout;

    this.timeoutProc = function timeoutProc() {
        console.log('timeouted');
        self.socket.emit('DisconnectReq');
    };
    this.datain = function(data) {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.timeoutProc, 15000);
    }
    this.timeout = setTimeout(this.timeoutProc, 15000);
}

io.sockets.on('connection', function (sockets) {//连接事件
    console.log('已连接' + io.eio.clientsCount + '个用户！');
    var client = new Client(sockets);
    sockets.on('disconnect', function(){
        console.log('当前还剩下：' + io.eio.clientsCount + '个用户连接！');
        if(io.eio.clientsCount === 0 && interval !== -1) {
            clearInterval(interval);
            interval = -1;
        }
        delete client;
    });
    if(!sockets.request._query.Token || sockets.request._query.Token !== Token) {
        console.log("Token错误，阻止连接！");
        io.sockets.emit("TokenAccess", false);
        delete client;
        return false;
    }else{
        io.sockets.emit("TokenAccess", true);
    }
    io.sockets.emit("cpuInfo", cpuInfo);
    if (interval < 0) {
        interval = setInterval(function () {
            var freeMem = os.freemem();
            var totalMem = os.totalmem();
            io.sockets.emit("cpuUpdate", {
                cpuUsage: currCPU * 100.0,
                freeMem: freeMem,
                totalMem: totalMem
            });
        }, 1000);//每隔1s取系统数据
    }
});

function updateCPU() {
    osUtils.cpuUsage(function (value) {
        currCPU = value;
        updateCPU();
    });
}

updateCPU();