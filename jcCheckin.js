/*
机场签到
cron: 16 8,22 * * *

自己定时，想什么时候签到就什么时候签到
适用于某些通用机场模板，自行测试你家机场能不能用
把机场域名，用户名和密码填到变量jcAccounts里，多账户用换行或者#隔开，格式：
export jcAccounts='host=biteb.cc; username=你的用户名; password=你的密码;'

自用的机场邀请(6元一个月)：
https://biteb.cc/auth/register?code=v7wt
*/
const $ = new Env('机场签到');
const jsname = '机场签到'
const logDebug = 0

const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
let notifyStr = ''

let envSplitor = ['\n','#']
let httpResult //global buffer
let httpResponse //global buffer

let userCookie = ($.isNode() ? process.env.jcAccounts : $.getdata('jcAccounts')) || '';
let userList = []

let userIdx = 0
let userCount = 0

let paramList = ['usr','pwd','host']
let paramName = {usr:'用户名', pwd:'密码', host:'机场域名'}

///////////////////////////////////////////////////////////////////
class UserInfo {
    constructor(str) {
        this.index = ++userIdx
        this.usr = str.indexOf('username=')>-1 ? str.match(/username=(.+?);/)[1] : ''
        this.pwd = str.indexOf('password=')>-1 ? str.match(/password=(.+?);/)[1] : ''
        this.host = str.indexOf('host=')>-1 ? str.match(/host=(.+?);/)[1] : ''
        this.cookie = ''
    }
    
    async login() {
        let url = `https://${this.host}/auth/login`
        let body = JSON.stringify({email:this.usr, passwd:this.pwd})
        let urlObject = populateUrlObject(url,this.cookie,body)
        await httpRequest('post',urlObject)
        let result = httpResponse;
        if(!result) return
        //console.log(httpResponse)
        if(result.status == 200) {
            let body = JSON.parse(result.body)
            if(body.ret == 1) {
                console.log(`[${this.usr}]: ${body.msg}`)
                this.cookie = result.headers["set-cookie"];
                await $.wait(200);
                await this.doSign();
                await $.wait(200);
                await this.getUser();
            } else {
                console.log(`[${this.usr}]: 登录失败: ${body.msg}`)
            }
        } else {
            console.log(`[${this.usr}]: 登录失败: 返回${result.status}`)
        }
    }
    
    async doSign() {
        let url = `https://${this.host}/user/checkin`
        let body = ``
        let urlObject = populateUrlObject(url,this.cookie,body)
        await httpRequest('post',urlObject)
        let result = httpResponse;
        if(!result) return
        //console.log(httpResponse)
        if(result.status == 200) {
            let body = JSON.parse(result.body)
            if(body.ret == 1) {
                console.log(`签到成功：${body.msg}`)
                notifyStr += `签到成功：${body.msg}\n`
            } else {
                console.log(`签到失败: ${body.msg}`)
                notifyStr += `签到失败：${body.msg}\n`
            }
        } else {
            console.log(`签到失败: 返回${result.status}`)
            notifyStr += `签到失败：${body.msg}\n`
        }
    }
    
    async getUser() {
        let url = `https://${this.host}/user`
        let body = ``
        let urlObject = populateUrlObject(url,this.cookie,body)
        await httpRequest('get',urlObject)
        let result = httpResponse;
        if(!result) return
        //console.log(httpResponse)
        if(result.status == 200) {
            for(let lines of result.body.split('\n')) {
                if(lines.search(/"Class_Expire" *,/) > -1) {
                    let expTime = lines.match(/"Class_Expire" *, *"(.+?)"/)[1]
                    console.log(`会员过期时间：${expTime}`)
                    notifyStr += `会员过期时间：${expTime}\n`
                } else if(lines.search(/"Unused_Traffic" *,/) > -1) {
                    let traffic = lines.match(/"Unused_Traffic" *, *"(.+?)"/)[1]
                    console.log(`剩余流量：${traffic}`)
                    notifyStr += `剩余流量：${traffic}\n`
                } else if(lines.search(/"Money" *,/) > -1) {
                    let money = lines.match(/"Money" *, *"(.+?)"/)[1]
                    console.log(`钱包余额：${money}`)
                    notifyStr += `钱包余额：${money}\n`
                }
            }
        } else {
            console.log(`账号[${this.usr}]查询账户信息失败: 返回${result.status}`)
        }
    }
    
    async userTask() {
        console.log(`\n=========== ${this.host ? this.host : '你没填机场域名跑个蛋'} ===========`)
        notifyStr += `\n=========== ${this.host ? this.host : '你没填机场域名跑个蛋'} ===========\n`
        let missList = []
        for(let param of paramList) {
            if(!this[param]) missList.push(paramName[param])
        }
        if(missList.length>0) {
            let str = missList.join('，')
            console.log(`没有找到以下参数：${str}`)
            notifyStr += `没有找到以下参数：${str}\n`
            return;
        }
        await this.login();
    }
}

!(async () => {
    if (typeof $request !== "undefined") {
        console.log('大聪明')
    }else {
        if(!(await checkEnv())) return;
        
        for(let user of userList) {
            await user.userTask(); 
            await $.wait(200);
        }
        
        await showmsg();
    }
})()
.catch((e) => $.logErr(e))
.finally(() => $.done())

///////////////////////////////////////////////////////////////////
async function checkEnv() {
    if(userCookie) {
        let splitor = envSplitor[0];
        for(let sp of envSplitor) {
            if(userCookie.indexOf(sp) > -1) {
                splitor = sp;
                break;
            }
        }
        for(let userCookies of userCookie.split(splitor)) {
            if(userCookies) userList.push(new UserInfo(userCookies))
        }
        userCount = userList.length
    } else {
        console.log('未找到机场用户名密码设置，请填写jcAccounts')
        return;
    }
    
    console.log(`共找到${userCount}个账号`)
    return true
}

//通知
async function showmsg() {
    if(!notifyStr) return;
    notifyBody = jsname + "运行通知\n\n" + notifyStr
    if (notifyFlag > 0) {
        $.msg(notifyBody);
        if($.isNode()){
            var notify = require('./sendNotify');
            await notify.sendNotify($.name, notifyBody );
        }
    } else {
        console.log(notifyBody);
    }
}

//pushDear
async function pushDear(str) {
    if(!PushDearKey) return;
    if(!str) return;
    
    console.log('\n============= PushDear 通知 =============\n')
    console.log(str)
    let urlObject = {
        url: `https://api2.pushdeer.com/message/push?pushkey=${PushDearKey}&text=${encodeURIComponent(str)}`,
        headers: {},
    };
    await httpRequest('get',urlObject)
    let result = httpResult;
    let retStr = result.content.result==false ? '失败' : '成功'
    console.log(`\n========== PushDear 通知发送${retStr} ==========\n`)
}
////////////////////////////////////////////////////////////////////
function populateUrlObject(url,cookie,body=''){
    let host = url.replace('//','/').split('/')[1]
    let urlObject = {
        url: url,
        headers: {
            Host: host,
            cookies: cookie,
            Cookie: cookie,
        },
    }
    if(body) {
        urlObject.body = body
        urlObject.headers['Content-Type'] =  'application/json'
        urlObject.headers['Content-Length'] = urlObject.body ? urlObject.body.length : 0
    }
    return urlObject;
}

async function httpRequest(method,url) {
    httpResult = null
    return new Promise((resolve) => {
        $[method](url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${method}请求失败`);
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                        httpResult = data;
                        httpResponse = resp;
                        if(logDebug) console.log(httpResult);
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),"PUT"===e&&(s=this.put),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}put(t){return this.send.call(this.env,t,"PUT")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}put(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.put(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="PUT",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.put(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}