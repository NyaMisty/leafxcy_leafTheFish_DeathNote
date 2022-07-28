// @grant require
/*
中青看点 看看赚
会跑比较久，3小时以上

需要zqkdCookie，自己捉包填写，多账号@隔开，格式：
uid=12345678&zqkey=xxxxxx&zqkey_id=yyyyyyy@uid=87654321&zqkey=zzzzzzzz&zqkey_id=aaaaaa

cron: 2 2,15 * * *
const $ = new Env('中青看点-看看赚');
*/
const jsname = '中青看点看看赚'
const $ = Env(jsname)
const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
const logDebug = 0

//const notify = $.isNode() ? require('./sendNotify') : '';
let notifyStr = ''

let rndtime = "" //毫秒
let httpResult //global buffer

var CryptoJS = require('crypto-js');

let userCookieArr = []
let bodyArr = []

let userIdx = 0
let allCompFlag = 0
let restNum = 0

let idStart = 2900
let idEnd = 5000
let idRunList = []

let extraList = [1182,2111]

let validList = []
let validStr = ''
let rewardCount = []
let boxList = []

let preBody = 'p=ecTMBiVxDAfc%3D'

let bodyTemplate = 'app_name=zqkd_app&app_version=3.9.8&carrier=%E4%B8%AD%E5%9B%BD%E7%94%B5%E4%BF%A1&channel=c1031&device_brand=OPPO&device_id=56805603&device_model=OPPO+R9tm&device_platform=android&device_type=android&dpi=480&inner_version=202108181534&language=zh-CN&memory=3&mi=0&mobile_type=1&net_type=1&network_type=WIFI&openudid=8cd3b52d8fd6dd9b&os_api=22&os_version=R9tm_11_A.53_191217&request_time=1637250670&resolution=1080x1920&rom_version=R9tm_11_A.53_191217&s_ad=O2JgR8oZr6IU%3DC_rQb0PVGILJXAXRqCK-8mMH6bi0gkt_&s_im=BYFg4QJ5A6eY%3DNy7jQqHtxpkJHJ7qLLev8g%3D%3D&sm_device_id=202111182157042fe759e829fd55d80ca5b5be0858ba1001d4f22d5ae158d7&storage=54.84&'

let fakeSign = '&sign=afec36be979753f62c4dbd4943472fca'

let key = '6HPjSZFH'
///////////////////////////////////////////////////////////////////

!(async () => {

    if(typeof $request !== "undefined")
    {
        $.msg(jsname+': 此脚本不做重写，请检查重写设置')
    }
    else
    {
        if(!(await checkEnv())) {
            return
        }
        
        await initAccountInfo()
        await runLookStart()
        await getBox()
        await getStat()
    }
  

})()
.catch((e) => $.logErr(e))
.finally(() => $.done())

//通知
async function showmsg() {
    
    notifyBody = jsname + "运行通知\n\n" + notifyStr
    
    if (notifyFlag != 1) {
        console.log(notifyBody);
    }

    if (notifyFlag == 1) {
        $.msg(notifyBody);
        //if ($.isNode()){await notify.sendNotify($.name, notifyBody );}
    }
}

async function checkEnv() {
    let userCookie = ($.isNode() ? process.env.zqkdCookie : $.getdata('zqkdCookie')) || '';
    let splitor = userCookie.includes('@') ? '@' : '\n'
    let userCookies = userCookie.split(splitor)
    for(let cks of userCookies) if(cks) userCookieArr.push(cks)
    if(userCookieArr.length == 0) {
        console.log('未找到有效的userCookie')
        return false
    }
    
    for(let i=0; i<extraList.length; i++) {
        idRunList.push(extraList[i])
    }
    for(let i=idStart; i<idEnd; i++) {
        idRunList.push(i)
    }
    
    console.log(`共找到${userCookieArr.length}个用户，本次运行将查询${idRunList.length}个看看赚任务ID`)
    return true
}

async function initAccountInfo() {
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        rewardCount.push(0)
        boxList.push([])
    }
}

function replaceCookie(userCookieItem) {
    let replaceItem = ''
    let zqkey = ''
    let zqkey_id = ''
    if(userCookieItem.indexOf('zqkey=') > -1) {
        zqkey = userCookieItem.match(/zqkey=([\w-]+)/)[1]
    } else if (userCookieItem.indexOf('cookie=') > -1) {
        zqkey = userCookieItem.match(/cookie=([\w-]+)/)[1]
    }
    if(userCookieItem.indexOf('zqkey_id=') > -1) {
        zqkey_id = userCookieItem.match(/zqkey_id=([\w-]+)/)[1]
    } else if (userCookieItem.indexOf('cookie_id=') > -1) {
        zqkey_id = userCookieItem.match(/cookie_id=([\w-]+)/)[1]
    }
    if(userCookieItem.indexOf('uid=') > -1) {
        uid = userCookieItem.match(/uid=([\w-]+)/)[1]
    }
    
    replaceItem = `uid=${uid}&version_code=63&zqkey=${zqkey}&zqkey_id=${zqkey_id}`
    
    return replaceItem
}

///////////////////////////////////////////////////////////////////
/*
async function decodeUserBody() {
    for(let i=0; i<bodyArr.length; i++) {
        deUrlBody = decodeURIComponent(bodyArr[i])
        idx1 = deUrlBody.indexOf('=')
        idx2 = deUrlBody.indexOf('=',idx1+1)
        idx3 = deUrlBody.lastIndexOf('=')
        preBody = deUrlBody.substring(0,idx2+1)
        pureBody = deUrlBody.substring(idx2+1,idx3+1)
        subBody = deUrlBody.substring(idx3+1)
        replaceBody1 = pureBody.replace(/-/g,'+')
        replaceBody2 = replaceBody1.replace(/_/g,'/')
        decodeStr = DecFunc(replaceBody2)
        decodedUserArr.push(decodeStr)
        preBodyArr.push(preBody)
        subBodyArr.push(subBody)
    }
}*/

async function encodeUserBody(idx,task_id) {
    replacedStr = bodyTemplate + `&task_id=${task_id}&` + userCookieArr[idx] + fakeSign
    encodeBody = EncFunc(replacedStr)
    hexBody = CryptoJS.enc.Hex.parse(encodeBody)
    base64Body = CryptoJS.enc.Base64.stringify(hexBody)
    replaceBody3 = base64Body.replace(/\+/g,'-')
    replaceBody4 = replaceBody3.replace(/\//g,'_')
    finalBody = encodeURIComponent(replaceBody4)
    finalBody = preBody + finalBody + randomString(1)
    return finalBody
}

async function runLookStart() {
    for(let i=0; i<idRunList.length; i++) {
        let id = idRunList[i]
        if(i%20 == 0) console.log(`正在查询任务，请耐心等待...`)
        allCompFlag = 1
        restNum = 0
        bodyArr = []
        compArr = []
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            let body = await encodeUserBody(userIdx,id)
            adlickstart(body,id,userIdx)
            await $.wait(60)
        }
        await $.wait(1000)
        if(allCompFlag == 1) continue
        console.log(`所有用户开始一起做看看赚任务[id:${id}]，阅读${restNum}次`)
        for(let i=0; i<restNum; i++) {
            for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
                if(compArr[userIdx] == 1) {
                    readLookStartArt(bodyArr[userIdx],i,userIdx)
                    await $.wait(60)
                }
            }
            let waitTime = Math.floor(Math.random()*2000)+5000
            console.log(`--完成第${i+1}轮阅读，随机等待${waitTime}ms`)
            await $.wait(waitTime)
        }
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(compArr[userIdx] == 1) {
                adlickend(bodyArr[userIdx],userIdx)
                await $.wait(60)
            }
        }
    }
}

async function getStat() {
    console.log(`============================`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        console.log(`账号${userIdx+1}本轮共获得了${rewardCount[userIdx]}金币`)
    }
    console.log(`============================`)
    for(let i=0; i<validList.length; i++) {
        validStr += `${validList[i]} `
    }
    console.log(`查询到${validList.length}个有效看看赚任务`)
    console.log(validStr)
}

//看看赚任务
async function adlickstart(body,id,idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v5/nameless/adlickstart.json'
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) {
        compArr.push(0)
        if(idx == 0) allCompFlag = 1
        return false
    }
    
    if(result.success == true) {
        if(result.items.comtele_state == 0) {
            allCompFlag = 0
            compArr.push(1)
            let readNum = result.items.see_num - result.items.read_num
            if(readNum==0) readNum=1
            restNum = (readNum>restNum) ? readNum : restNum
            console.log(`用户${idx+1}未完成看看赚[id:${id}]，还需阅读${readNum}次`)
        } else  {
            compArr.push(0)
            console.log(`用户${idx+1}已完成看看赚[id:${id}]`)
        }
        if(idx == 0) validList.push(id)
        bodyArr.push(body)
    } else {
        compArr.push(0)
        if(idx == 0) allCompFlag = 1
        if(result.error_code == 200001) console.log(`非法请求，请检查用户${idx+1}的ck`)
        return false
    }
    
    return true
}

//阅读看看赚文章
async function readLookStartArt(body,idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v5/nameless/bannerstatus.json'
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success != true) {
        console.log(`--用户${idx+1}阅读看看赚文章失败：${result.message}`)
    }
}

//看看赚任务完成
async function adlickend(body,idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v5/nameless/adlickend.json'
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`用户${idx+1}完成看看赚[id:${result.items.banner_id}]任务，获得${result.items.score}金币`)
        rewardCount[idx] += parseInt(result.items.score)
    } else {
        console.log(`用户${idx+1}完成看看赚任务失败：${result.message}`)
    }
}

async function getBox() {
    let maxBoxNum = 0
    console.log(`========================================================`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        await getBoxRewardConf()
        maxBoxNum = getMax(maxBoxNum,boxList[userIdx].length)
    }
    for(let i=0; i<maxBoxNum; i++) {
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(i<boxList[userIdx].length) await getBoxReward(boxList[userIdx][i])
        }
        if(i<maxBoxNum-1) await $.wait(Math.floor(Math.random()*1000)+1000)
    }
}

//看看赚宝箱状态
async function getBoxRewardConf() {
    let caller = printCaller()
    let reqCk = 'device_type=android&' + userCookieArr[userIdx]
    let url = 'http://kandian.wkandian.com/WebApi/Nameless/getBoxRewardConf?' + reqCk
    let urlObject = populateGetUrl(url)
    urlObject.headers.Referer = 'http://kandian.wkandian.com/h5/20190527watchMoney/?' + reqCk
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        for(let boxItem of result.data.list) {
            boxList[userIdx].push(boxItem.id)
        }
    } else {
        console.log(`用户${userIdx+1}获取看看赚宝箱状态失败：${result.message}`)
    }
}

//看看赚宝箱领取
async function getBoxReward(id) {
    let caller = printCaller()
    let reqCk = 'device_type=android&app_version=3.9.8&' + userCookieArr[userIdx]
    reqCk = reqCk.replace(/\&zqkey/g,'&cookie')
    let url = `http://kandian.wkandian.com/WebApi/Nameless/getBoxReward?id=${id}&${reqCk}`
    let urlObject = populateGetUrl(url)
    urlObject.headers.Referer = 'http://kandian.wkandian.com/h5/20190527watchMoney/?' + reqCk
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        console.log(`用户${userIdx+1}打开第${id+1}个看看赚宝箱获得：${result.data}金币`)
        rewardCount[userIdx] += parseInt(result.data)
    } else {
        console.log(`用户${userIdx+1}领取第${id+1}个看看赚宝箱失败：${result.msg}`)
    }
}
////////////////////////////////////////////////////////////////////
function populatePostUrl(url,reqBody){
    let rndtime = Math.floor(new Date().getTime()/1000)
    let urlObject = {
        url: url,
        headers: {
            'request_time' : rndtime,
            'Host' : 'kandian.wkandian.com',
            'device-model' : 'VOG-AL10',
            'device-platform' : 'android',
            'Connection' : 'keep-alive',
        },
        body: reqBody
    }
    return urlObject;
}

function populateGetUrl(url){
    let rndtime = Math.floor(new Date().getTime()/1000)
    let urlObject = {
        url: url,
        headers: {
            'request_time' : rndtime,
            'Host' : 'kandian.wkandian.com',
            'device-model' : 'VOG-AL10',
            'device-platform' : 'android',
            'Connection' : 'keep-alive',
        }
    }
    return urlObject;
}

async function httpPost(url,caller) {
    httpResult = null
    return new Promise((resolve) => {
        $.post(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(caller + ": post请求失败");
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

async function httpGet(url,caller) {
    httpResult = null
    return new Promise((resolve) => {
        $.get(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(caller + ": get请求失败");
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data,caller)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function safeGet(data,caller) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        } else {
            console.log(`Function ${caller}: 未知错误`);
            console.log(data)
        }
    } catch (e) {
        console.log(e);
        console.log(`Function ${caller}: 服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function printCaller(){
    return (new Error()).stack.split("\n")[2].trim().split(" ")[1]
}

function getMin(a,b){
    return ((a<b) ? a : b)
}

function getMax(a,b){
    return ((a<b) ? b : a)
}

function EncFunc(message) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var ivHex = CryptoJS.enc.Utf8.parse(key);
    var word = CryptoJS.enc.Utf8.parse(message);
    encrypted = CryptoJS.DES.encrypt(
        word, 
        keyHex, 
        {iv:ivHex, mode:CryptoJS.mode.CBC, padding:CryptoJS.pad.Pkcs7}
    );
return encrypted.ciphertext.toString();
}

function DecFunc(message) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var ivHex = CryptoJS.enc.Utf8.parse(key);
    // direct decrypt ciphertext
    var decrypted = CryptoJS.DES.decrypt(
        {ciphertext: CryptoJS.enc.Base64.parse(message)}, 
        keyHex, 
        {iv:ivHex, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7}
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function randomString(len=12) {
    let chars = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
    let maxLen = chars.length;
    let str = '';
    for (i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random()*maxLen));
    }
    return str;
}

function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t) { let e = { "M+": (new Date).getMonth() + 1, "d+": (new Date).getDate(), "H+": (new Date).getHours(), "m+": (new Date).getMinutes(), "s+": (new Date).getSeconds(), "q+": Math.floor(((new Date).getMonth() + 3) / 3), S: (new Date).getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length))); for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))); let h = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; h.push(e), s && h.push(s), i && h.push(i), console.log(h.join("\n")), this.logs = this.logs.concat(h) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
