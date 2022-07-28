// @grant require
/*
中青看点 自动阅读

需要zqkdCookie，自己捉包填写，多账号@隔开，格式：
uid=12345678&zqkey=xxxxxx&zqkey_id=yyyyyyy@uid=87654321&zqkey=zzzzzzzz&zqkey_id=aaaaaa

cron: 4-59/15 11-18 * * *
const $ = new Env('中青看点-自动阅读');
*/
const jsname = '中青看点文章视频'
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

let artCatid = 0
let videoCatid = 1453

let readLength = 0
let maxReadLength = 16
let rewardCount = []
let userArtList = []

let artPreBody = 'p=swNMsLAQgw3E%3D'
let timePreBody = 'p=swNMsLAQgw3E%3D'

let key = '6HPjSZFH'

let fixStr = 'jdvylqchJZrfw0o2DgAbsmCGUapF1YChc'
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
        await userDouble()
        await userGetList()
        await userReads()
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
    
    console.log(`共找到${userCookieArr.length}个用户`)
    return true
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
    
    replaceItem = `uid=${uid}&zqkey=${zqkey}&zqkey_id=${zqkey_id}`
    
    return replaceItem
}

async function initAccountInfo() {
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        rewardCount.push(0)
        userArtList.push([])
    }
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

function encodeMD5Str(encStr) {
    replacedStr = decodeURIComponent(encStr)
    replacedStr = replacedStr.replace(/\&/g,'')
    replacedStr = replacedStr.replace(/\+/g,' ')
    replacedStr += fixStr
    md5Str = CryptoJS.MD5(replacedStr).toString()
    return md5Str
}

function encodeUserBody(prebody,inputStr) {
    encodeBody = EncFunc(inputStr)
    hexBody = CryptoJS.enc.Hex.parse(encodeBody)
    base64Body = CryptoJS.enc.Base64.stringify(hexBody)
    replaceBody3 = base64Body.replace(/\+/g,'-')
    replaceBody4 = replaceBody3.replace(/\//g,'_')
    finalBody = encodeURIComponent(replaceBody4)
    finalBody = prebody + finalBody + '=='
    return finalBody
}

async function getStat() {
    console.log(`\n============================`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        console.log(`账号${userIdx+1}本轮共获得了${rewardCount[userIdx]}金币`)
    }
}

//并发阅读
async function userGetList() {
    console.log(`\n读取推荐文章视频列表...`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        ListArts(artCatid,videoCatid,userIdx)
        await $.wait(60)
    }
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        ListArts(videoCatid,artCatid,userIdx)
        await $.wait(60)
    }
    await $.wait(3000)
}

//文章列表
async function ListArts(catid,vcatid,idx) {
    let caller = printCaller()
    let rndtime1 = Math.floor(new Date().getTime())
    let rndtime2 = Math.floor(new Date().getTime()/1000)
    let op = Math.floor(Math.random()*4)
    let paraList = userCookieArr[idx].split('&')
    let md5Para = `access=WIFI&app_name=zqkd_app&app_version=3.9.8&behot_time=0&carrier=CHINA%20MOBILE&catid=${catid}&channel=c1031&device_brand=Android&device_id=56971302&device_model=MI%209&device_platform=android&device_type=android&dpi=240&inner_version=202108181534&language=zh-CN&memory=3&mi=0&mobile_type=1&net_type=1&network_type=WIFI&oid=0&op=${op}&openudid=a6066063b6fbed67&os_api=22&os_version=MI%209-user%205.1.1%20NMF26X%20500211025%20release-keys&phone_sim=1&request_time=${rndtime2}&resolution=720x1280&rom_version=MI%209-user%205.1.1%20NMF26X%20500211025%20release-keys&s_ad=7wNMsLAQgw3E%3DsFCZYRlUUiSfaqjzozPOmj1DJGsQ0-KRmn&s_im=9FbVGOYyXwIo%3DZjZvSuQeb_qdBallAGaXUg%3D%3D8&sm_device_id=20211112123533c490f279d26a934ca445950324c9601a01419a1241729573&storage=61.39&${paraList[0]}&version_code=63&video_catid=${vcatid}&${paraList[1]}&${paraList[2]}`
    let sign = encodeMD5Str(md5Para,paraList)
    let url = `https://kandian.wkandian.com/v3/article/lists.json?catid=${catid}&op=${op}&behot_time=0&oid=0&video_catid=${vcatid}&access=WIFI&app_name=zqkd_app&app_version=3.9.8&carrier=CHINA%20MOBILE&channel=c1031&device_brand=Android&device_id=56971302&device_model=MI%209&device_platform=android&device_type=android&dpi=240&inner_version=202108181534&language=zh-CN&memory=3&mi=0&mobile_type=1&net_type=1&network_type=WIFI&openudid=a6066063b6fbed67&os_api=22&os_version=MI%209-user%205.1.1%20NMF26X%20500211025%20release-keys&phone_sim=1&request_time=${rndtime2}&resolution=720x1280&rom_version=MI%209-user%205.1.1%20NMF26X%20500211025%20release-keys&s_ad=7wNMsLAQgw3E%3DsFCZYRlUUiSfaqjzozPOmj1DJGsQ0-KRmn&s_im=9FbVGOYyXwIo%3DZjZvSuQeb_qdBallAGaXUg%3D%3D8&sm_device_id=20211112123533c490f279d26a934ca445950324c9601a01419a1241729573&storage=61.39&${paraList[0]}&version_code=63&${paraList[1]}&${paraList[2]}&sign=${sign}`
    
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    let typeStr = ''
    if(catid == 0) typeStr = '文章'
    else if(catid == 1453) typeStr = '视频'
    
    if(result.success == true) {
        for(let i=0; i<result.items.length-3; i++) {
            let artItem = result.items[i]
            let ctype = artItem.ctype ? artItem.ctype : ''
            if(ctype == 0 || ctype == 3) {
                userArtList[idx].push(artItem)
            }
        }
        console.log(`账号${idx+1}获取${typeStr}列表成功[catid=${catid}]`)
    } else {
        console.log(`账号${idx+1}获取${typeStr}列表失败：${result.message}`)
    }
}

//并发阅读
async function userReads() {
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        readLength = getMax(readLength,userArtList[userIdx].length)
    }
    readLength = getMin(readLength,maxReadLength)
    console.log(`\n本次运行将会阅读最多${readLength}篇文章视频`)
    for(let i=0; i<readLength; i++) {
        console.log(`\n======== 开始第${i+1}轮阅读 ========`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(i<userArtList[userIdx].length) {
                GetArtsInfo(userArtList[userIdx][i],userIdx)
                await $.wait(60)
            }
        }
        await $.wait(1000)
        if(i==0) {
            for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
                if(i<userArtList[userIdx].length) {
                    CompleteArt(userArtList[userIdx][i].id,1,userIdx)
                    await $.wait(60)
                }
            }
        }
        let waitTime = 31000 + Math.floor(Math.random()*4000)
        console.log(`随机等待${waitTime/1000}秒...`)
        await $.wait(waitTime)
        
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(i<userArtList[userIdx].length) {
                CompleteArt(userArtList[userIdx][i].id,0,userIdx)
                await $.wait(60)
            }
        }
        if(i%3 == 2) {
            for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
                let stayTime = 80 + Math.floor(Math.random()*10)
                if(i<userArtList[userIdx].length) {
                    UpdateStayTime(stayTime,userIdx)
                    await $.wait(60)
                }
            }
        }
    }
}

//阅读文章，观看视频
async function GetArtsInfo(artItem,idx) {
    let caller = printCaller()
    let rndtime = Math.floor(new Date().getTime()/1000)
    let paraList = userCookieArr[idx].split('&')
    let md5Para = `app_name=zqkd_app&app_version=3.9.8&carrier=CHINA+MOBILE&catid=${artItem.catid}&channel=c1031&device_brand=Android&device_id=56971302&device_model=MI+9&device_platform=android&device_type=android&dpi=240&id=${artItem.id}&inner_version=202108181534&is_push=0&language=zh-CN&memory=3&mi=0&mobile_type=1&net_type=1&network_type=WIFI&openudid=a6066063b6fbed67&os_api=22&os_version=MI+9-user+5.1.1+NMF26X+500211025+release-keys&request_time=${rndtime}&resolution=720x1280&rom_version=MI+9-user+5.1.1+NMF26X+500211025+release-keys&s_ad=E2JgR8oZr6IU%3DPE0cx099D1kf6lH6CywmGZt1WpGEHC6k&s_im=XYdVi_XPUOzA%3D7RAdU6ohamNZSaVJf3_tqA%3D%3DZB&sm_device_id=20211112123533c490f279d26a934ca445950324c9601a01419a1241729573&storage=61.39&${paraList[0]}&version_code=63&${paraList[1]}&${paraList[2]}`
    let sign = encodeMD5Str(md5Para)
    let desEnc = md5Para + '&sign=' + sign
    let desStr = encodeUserBody(artPreBody,desEnc)
    let urlPattern = ''
    let readType = ''
    if(artItem.ctype == 0) {
        urlPattern = 'info'
        readType = '阅读文章'
    } else if(artItem.ctype == 3) {
        urlPattern = 'detail'
        readType = '观看视频'
    }
    let url = `https://kandian.wkandian.com/v5/article/${urlPattern}.json?` + desStr
    
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`账号${idx+1}开始${readType}：${artItem.title}`)
    } else {
        console.log(`账号${idx+1}${readType}失败：${result.message}`)
    }
    
}

//阅读完成奖励
async function CompleteArt(id,type,idx) {
    let caller = printCaller()
    let str = (type==0) ? '阅读' : '推送'
    let rndtime = Math.floor(new Date().getTime()/1000)
    let paraList = userCookieArr[idx].split('&')
    let md5Para = `app_name=zqkd_app&app_version=3.9.8&carrier=CHINA+MOBILE&channel=c1031&device_brand=Android&device_id=56971302&device_model=MI+9&device_platform=android&device_type=android&dpi=240&id=${id}&inner_version=202108181534&language=zh-CN&memory=3&mi=0&mobile_type=1&net_type=1&network_type=WIFI&openudid=a6066063b6fbed67&os_api=22&os_version=MI+9-user+5.1.1+NMF26X+500211025+release-keys&read_type=${type}&request_time=${rndtime}&resolution=720x1280&rom_version=MI+9-user+5.1.1+NMF26X+500211025+release-keys&s_ad=8YFg4QJ5A6eY%3DV7HSxw3xQPoqyBklmolHheSGzQ_tFjm0&s_im=NYdVi_XPUOzA%3D7RAdU6ohamNZSaVJf3_tqA%3D%3DlK&sm_device_id=20211112123533c490f279d26a934ca445950324c9601a01419a1241729573&storage=61.39&${paraList[0]}&version_code=63&${paraList[1]}&${paraList[2]}`
    let sign = encodeMD5Str(md5Para)
    let desEnc = md5Para + '&sign=' + sign
    let desStr = encodeUserBody(artPreBody,desEnc)
    let url = 'https://kandian.wkandian.com/v5/article/complete.json'
    
    let urlObject = populatePostUrl(url,desStr)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        if(result.items && result.items.read_score) {
            rewardCount[idx] += parseInt(result.items.read_score)
            console.log(`账号${idx+1}领取${str}奖励：获得${result.items.read_score}金币`)
        } else {
            if(result.items && result.items.max_notice) {
                console.log(`账号${idx+1}没有领取到${str}奖励：${result.items.max_notice}`)
            } else {
                console.log(`账号${idx+1}没有领取到${str}奖励`)
            }
        }
    } else {
        console.log(`账号${idx+1}领取${str}奖励失败：${result.message}`)
    }
    
}

//更新时长
async function UpdateStayTime(tsceond,idx) {
    let caller = printCaller()
    let rndtime = Math.floor(new Date().getTime()/1000)
    let paraList = userCookieArr[idx].split('&')
    let md5Para = `app_name=zqkd_app&app_version=3.9.8&carrier=CHINA+MOBILE&channel=c1031&device_brand=Android&device_id=56971302&device_model=MI+9&device_platform=android&device_type=android&dpi=240&inner_version=202108181534&language=zh-CN&memory=3&mi=0&mobile_type=1&net_type=1&network_type=WIFI&oaid=9bdf7bff-f3fe-2b18-5fff-3b3f3fd6873d&openudid=a6066063b6fbed67&os_api=22&os_version=MI+9-user+5.1.1+NMF26X+500211025+release-keys&request_time=1637953113&resolution=720x1280&rom_version=MI+9-user+5.1.1+NMF26X+500211025+release-keys&s_ad=c2JgR8oZr6IU%3DPE0cx099D1kf6lH6CywmGZt1WpGEHC6k&second=${tsceond}&sm_device_id=20211112123533c490f279d26a934ca445950324c9601a01419a1241729573&storage=61.39&${paraList[0]}&version_code=63&${paraList[1]}&${paraList[2]}`
    let sign = encodeMD5Str(md5Para)
    let desEnc = md5Para + '&sign=' + sign
    let desStr = encodeUserBody(timePreBody,desEnc)
    let url = 'https://kandian.wkandian.com/v5/user/stay.json'
    
    let urlObject = populatePostUrl(url,desStr)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`账号${idx+1}更新时长${tsceond}秒成功，今日阅读时长：${result.time}秒`)
    } else {
        console.log(`账号${idx+1}更新时长失败：${result.message}`)
    }
    
}

//用户阅读翻倍
async function userDouble() {
    console.log(`\n查询账户阅读翻倍状态中...`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        GetTaskList(userIdx)
        await $.wait(100)
    }
}

//翻倍状态
async function GetTaskList(idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v17/NewTask/getTaskList.json?app_version=3.9.8&' + userCookieArr[idx]
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        if(result.items && result.items.task_promotion && result.items.task_promotion.is_double==0) await GetReadDouble(idx)
    } else {
        console.log(`账号${idx+1}查询阅读翻倍状态失败：${result.message}`)
    }
}

//阅读翻倍
async function GetReadDouble(idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v17/NewTask/setJoinTaskPromotion.json?' + userCookieArr[idx]
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`账号${idx+1}本周阅读翻倍成功`)
    } else {
        console.log(`账号${idx+1}阅读翻倍失败：${result.message}`)
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
            console.log(`Function ${caller}: 未知失败`);
            console.log(data)
        }
    } catch (e) {
        console.log(e);
        console.log(`Function ${caller}: 服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function getMin(a,b){
    return ((a<b) ? a : b)
}

function getMax(a,b){
    return ((a<b) ? b : a)
}

function printCaller(){
    return (new Error()).stack.split("\n")[2].trim().split(" ")[1]
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
