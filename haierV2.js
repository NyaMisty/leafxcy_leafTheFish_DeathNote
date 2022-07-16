/*
海尔智家

活动专区-智慧小屋
自己捉mps.haiersmarthomes.com的包
把token和clientId填到haierAccount里，多账号换行隔开
export haierAccount="token#clientId"

一天一两次
cron: 44 0,18 * * *
*/
const $ = new Env("海尔智家");

let envSplitor = ['\n']

let userCookie = ($.isNode() ? process.env.haierAccount : $.getdata('haierAccount')) || '';

let userList = []
let userIdx = 0
let userCount = 0

let extraTaskList = ['T0181','T0182','T0183']

let appId = 'MB-UZHSH-0001'
let appVersion = '7.12.0'
let appKey = '5dfca8714eb26e3a776e58a8273c8752'
let defaultUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/19A346 NebulaSDK/1.8.100112 Nebula WK PSDType(1) mPaaSClient/(null) App/Uplus Nebula'
let Referer = 'https://zjrs.haier.net/'
let Origin = 'https://zjrs.haier.net'
///////////////////////////////////////////////////////////////////
class UserInfo {
    constructor(str) {
        this.index = ++userIdx
        this.name = this.index
        this.valid = false
        
        let info = str.split('#')
        this.token = info[0]
        this.clientId = info[1]
    }
    
    async taskApi(paramIn={}) {
        let paramOut = {}
        try {
            let host = paramIn.url.replace('//','/').split('/')[1]
            let urlObject = {
                url: paramIn.url,
                headers: {
                    'Host': host,
                    'Connection': 'keep-alive',
                    'accountToken': this.token,
                    'accessToken': this.token,
                    'clientId': this.clientId,
                    'appId': appId,
                    'timestamp': Date.now(),
                    'appVersion': appVersion,
                    'User-Agent': defaultUA,
                    'Referer': Referer,
                    'Origin': Origin,
                    'appKey': appKey,
                },
                timeout: 5000,
            }
            if(paramIn.body) {
                urlObject.headers['Content-Type'] = paramIn['Content-Type'] || 'application/json;charset=utf-8'
                if(typeof paramIn.body === 'object') {
                    if(urlObject.headers['Content-Type'].includes('json')) {
                        urlObject.body = JSON.stringify(paramIn.body)
                    } else {
                        urlObject.body = $.json2str(paramIn.body,'&')
                    }
                } else {
                    urlObject.body = paramIn.body
                }
            }
            if(paramIn.urlObjectParam) Object.assign(urlObject,paramIn.urlObjectParam)
            if(paramIn.headerParam) Object.assign(urlObject.headers,paramIn.headerParam)
                
            paramOut = Object.assign({},await httpRequest(paramIn.method,urlObject))
            if(paramOut.err) {
                paramOut.statusCode = paramOut?.err?.response?.statusCode
            } else {
                paramOut.statusCode = paramOut?.resp?.statusCode
                if(paramOut?.resp?.body) {
                    try {
                        paramOut.result = JSON.parse(paramOut.resp.body)
                    } catch (e) {
                        paramOut.result = paramOut.resp.body
                    }
                }
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async queryTask() {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://mps.haiersmarthomes.com/api-gw/wisdomHouseActivity/task/queryTask`,
                body: {
                    publishType: 2,
                    sourceClient: 1,
                }
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode == '00000') {
                    this.star = result.data.wisdomStarBalance
                    for(let task of result.data.taskList) {
                        console.log(`任务[${task.taskCode}][${task.taskTitle}] -- ${task.taskStatus==1?'已':'未'}完成`)
                        if(task.taskStatus!=1) {
                            await this.doTask(task);
                        }
                    }
                } else {
                    console.log(`查询任务列表失败：${result.retInfo}`)
                }
            } else {
                console.log(`[queryTask]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async queryStar() {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://mps.haiersmarthomes.com/api-gw/wisdomHouseActivity/task/queryTask`,
                body: {
                    publishType: 2,
                    sourceClient: 1,
                }
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode == '00000') {
                    this.star = result.data.wisdomStarBalance
                    console.log(`智慧星：${this.star}`)
                    while(this.star >= 20) {
                        await this.lotteryPrize();
                    }
                } else {
                    console.log(`查询任务列表失败：${result.retInfo}`)
                }
            } else {
                console.log(`[queryTask]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async doTask(task) {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://mps.haiersmarthomes.com/api-gw/wisdomHouseActivity/task/doTask`,
                body: {
                    taskCode: task.taskCode,
                    sourceClient: 1,
                }
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode == '00000') {
                    console.log(`完成任务[${task.taskCode}]成功：${result.retInfo}`)
                } else {
                    console.log(`完成任务[${task.taskCode}]失败：${result.retInfo}`)
                }
            } else {
                console.log(`[doTask]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async lotteryPrize() {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://mps.haiersmarthomes.com/api-gw/wisdomHouseActivity/lottery/lotteryPrize`,
                body: {}
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode == '00000') {
                    this.star -= 20;
                    console.log(`抽奖获得${result.data.prizeExtra.prizeName}`)
                } else {
                    console.log(`抽奖失败：${result.retInfo}`)
                }
            } else {
                console.log(`[lotteryPrize]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async signIn() {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://mps.haiersmarthomes.com/api-gw/wisdomHouseActivity/sign/signIn`,
                body: {}
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode == '00000') {
                    if(result.data.firstSign) {
                        console.log(`签到成功`)
                    }
                } else {
                    console.log(`签到失败：${result.retInfo}`)
                }
            } else {
                console.log(`[signIn]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async getUserPointsAndWallet() {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://zj.haier.net/zjapi/zjBaseServer/signDetail/getUserPointsAndWallet`,
                body: {}
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode=='00000') {
                    console.log(`海贝：${result.data.haiBeiTotal}`)
                    console.log(`红包：${result.data.wallet}`)
                } else {
                    console.log(`查询余额失败: ${result.retInfo}`)
                }
            } else {
                console.log(`[getUserPointsAndWallet]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {}
    }
    
    async appDailySign() {
        let paramOut = {}
        try {
            let urlParam = {
                method: 'post',
                url: `https://zj.haier.net/zjapi/zjBaseServer/daily/sign`,
                body: {}
            }
            paramOut = Object.assign({},await this.taskApi(urlParam))
            if(typeof paramOut?.result === 'object') {
                let result = paramOut.result
                if(result.retCode == '00000') {
                    if(result.data.first) {
                        console.log(`签到成功，获得${result.data.haibeiCount}海贝`)
                    }
                } else {
                    console.log(`签到失败：${result.retInfo}`)
                }
            } else {
                console.log(`[signIn]没有返回json数据`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
    
    async userTask() {
        let paramOut = {}
        try {
            console.log(`\n============= 账号[${this.index}] =============`)
            await this.signIn();
            await this.queryTask();
            console.log('------------ 做隐藏任务 ------------')
            for(let taskCode of extraTaskList) {
                await this.doTask({taskCode})
            }
            console.log('------------------------------------')
            await this.queryStar();
            await this.appDailySign();
            await this.getUserPointsAndWallet();
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(paramOut);
        }
    }
}

!(async () => {
    if (typeof $request !== "undefined") {
        await GetRewrite()
    }else {
        if(!(await checkEnv())) return;
        
        for(let user of userList) {
            await user.userTask(); 
        }
        
        await $.showmsg();
    }
})()
.catch((e) => console.log(e))
.finally(() => $.done())

///////////////////////////////////////////////////////////////////
async function GetRewrite() {
}

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
        console.log('未找到CK')
        return;
    }
    
    console.log(`共找到${userCount}个账号`)
    return true
}
////////////////////////////////////////////////////////////////////
async function httpRequest(method,url) {
    return new Promise((resolve) => {
        $.send(method, url, async (err, req, resp) => {
            resolve({err,req,resp})
        })
    });
}
////////////////////////////////////////////////////////////////////
function Env(name,env) {
    "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0);
    return new class {
        constructor(name,env) {
            this.name = name
            this.notifyStr = ''
            this.startTime = (new Date).getTime()
            Object.assign(this,env)
            console.log(`${this.name} 开始运行：\n`)
        }
        isNode() {
            return "undefined" != typeof module && !!module.exports
        }
        isQuanX() {
            return "undefined" != typeof $task
        }
        isSurge() {
            return "undefined" != typeof $httpClient && "undefined" == typeof $loon
        }
        isLoon() {
            return "undefined" != typeof $loon
        }
        getdata(t) {
            let e = this.getval(t);
            if (/^@/.test(t)) {
                const[, s, i] = /^@(.*?)\.(.*?)$/.exec(t),
                r = s ? this.getval(s) : "";
                if (r)
                    try {
                        const t = JSON.parse(r);
                        e = t ? this.lodash_get(t, i, "") : e
                    } catch (t) {
                        e = ""
                    }
            }
            return e
        }
        setdata(t, e) {
            let s = !1;
            if (/^@/.test(e)) {
                const[, i, r] = /^@(.*?)\.(.*?)$/.exec(e),
                o = this.getval(i),
                h = i ? "null" === o ? null : o || "{}" : "{}";
                try {
                    const e = JSON.parse(h);
                    this.lodash_set(e, r, t),
                    s = this.setval(JSON.stringify(e), i)
                } catch (e) {
                    const o = {};
                    this.lodash_set(o, r, t),
                    s = this.setval(JSON.stringify(o), i)
                }
            }
            else {
                s = this.setval(t, e);
            }
            return s
        }
        getval(t) {
            return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
        }
        setval(t, e) {
            return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
        }
        send(m, t, e = (() => {})) {
            if(m != 'get' && m != 'post' && m != 'put' && m != 'delete') {
                console.log(`无效的http方法：${m}`);
                return;
            }
            if(m == 'get' && t.headers) {
                delete t.headers["Content-Type"];
                delete t.headers["Content-Length"];
            } else if(t.body && t.headers) {
                if(!t.headers["Content-Type"]) t.headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
            if(this.isSurge() || this.isLoon()) {
                if(this.isSurge() && this.isNeedRewrite) {
                    t.headers = t.headers || {};
                    Object.assign(t.headers, {"X-Surge-Skip-Scripting": !1});
                }
                let conf = {
                    method: m,
                    url: t.url,
                    headers: t.headers,
                    timeout: t.timeout,
                    data: t.body
                };
                if(m == 'get') delete conf.data
                $axios(conf).then(t => {
                    const {
                        status: i,
                        request: q,
                        headers: r,
                        data: o
                    } = t;
                    e(null, q, {
                        statusCode: i,
                        headers: r,
                        body: o
                    });
                }).catch(err => console.log(err))
            } else if (this.isQuanX()) {
                t.method = m.toUpperCase(), this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                        hints: !1
                    })),
                $task.fetch(t).then(t => {
                    const {
                        statusCode: i,
                        request: q,
                        headers: r,
                        body: o
                    } = t;
                    e(null, q, {
                        statusCode: i,
                        headers: r,
                        body: o
                    })
                }, t => e(t))
            } else if (this.isNode()) {
                this.got = this.got ? this.got : require("got");
                const {
                    url: s,
                    ...i
                } = t;
                this.instance = this.got.extend({
                    followRedirect: false
                });
                this.instance[m](s, i).then(t => {
                    const {
                        statusCode: i,
                        request: q,
                        headers: r,
                        body: o
                    } = t;
                    e(null, q, {
                        statusCode: i,
                        headers: r,
                        body: o
                    })
                }, t => {
                    const {
                        message: s,
                        request: q,
                        response: i
                    } = t;
                    e(s, q, i)
                })
            }
        }
        time(t,x=null) {
            let xt = x ? new Date(x) : new Date
            let e = {
                "M+": xt.getMonth() + 1,
                "d+": xt.getDate(),
                "h+": xt.getHours(),
                "m+": xt.getMinutes(),
                "s+": xt.getSeconds(),
                "q+": Math.floor((xt.getMonth() + 3) / 3),
                S: xt.getMilliseconds()
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, (xt.getFullYear() + "").substr(4 - RegExp.$1.length)));
            for (let s in e)
                new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length)));
            return t
        }
        async showmsg() {
            if(!this.notifyStr) return;
            let notifyBody = this.name + " 运行通知\n\n" + this.notifyStr
            if($.isNode()){
                var notify = require('./sendNotify');
                console.log('\n============== 推送 ==============')
                await notify.sendNotify(this.name, notifyBody);
            } else {
                this.msg(notifyBody);
            }
        }
        logAndNotify(str) {
            console.log(str)
            this.notifyStr += str
            this.notifyStr += '\n'
        }
        logAndNotifyWithTime(str) {
            let t = '['+this.time('hh:mm:ss.S')+']'+str
            console.log(t)
            this.notifyStr += t
            this.notifyStr += '\n'
        }
        logWithTime(str) {
            console.log('['+this.time('hh:mm:ss.S')+']'+str)
        }
        msg(e = t, s = "", i = "", r) {
            const o = t => {
                if (!t)
                    return t;
                if ("string" == typeof t)
                    return this.isLoon() ? t : this.isQuanX() ? {
                        "open-url": t
                    }
                 : this.isSurge() ? {
                    url: t
                }
                 : void 0;
                if ("object" == typeof t) {
                    if (this.isLoon()) {
                        let e = t.openUrl || t.url || t["open-url"],
                        s = t.mediaUrl || t["media-url"];
                        return {
                            openUrl: e,
                            mediaUrl: s
                        }
                    }
                    if (this.isQuanX()) {
                        let e = t["open-url"] || t.url || t.openUrl,
                        s = t["media-url"] || t.mediaUrl;
                        return {
                            "open-url": e,
                            "media-url": s
                        }
                    }
                    if (this.isSurge()) {
                        let e = t.url || t.openUrl || t["open-url"];
                        return {
                            url: e
                        }
                    }
                }
            };
            this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r)));
            let h = ["", "============== 系统通知 =============="];
            h.push(e),
            s && h.push(s),
            i && h.push(i),
            console.log(h.join("\n"))
        }
        getMin(a,b){
            return ((a<b) ? a : b)
        }
        getMax(a,b){
            return ((a<b) ? b : a)
        }
        padStr(num,length,padding='0') {
            let numStr = String(num)
            let numPad = (length>numStr.length) ? (length-numStr.length) : 0
            let retStr = ''
            for(let i=0; i<numPad; i++) {
                retStr += padding
            }
            retStr += numStr
            return retStr;
        }
        json2str(obj,c,encodeUrl=false) {
            let ret = []
            for(let keys of Object.keys(obj).sort()) {
                let v = obj[keys]
                if(v && encodeUrl) v = encodeURIComponent(v)
                ret.push(keys+'='+v)
            }
            return ret.join(c);
        }
        str2json(str,decodeUrl=false) {
            let ret = {}
            for(let item of str.split('&')) {
                if(!item) continue;
                let idx = item.indexOf('=')
                if(idx == -1) continue;
                let k = item.substr(0,idx)
                let v = item.substr(idx+1)
                if(decodeUrl) v = decodeURIComponent(v)
                ret[k] = v
            }
            return ret;
        }
        randomString(len,charset='abcdef0123456789') {
            let str = '';
            for (let i = 0; i < len; i++) {
                str += charset.charAt(Math.floor(Math.random()*charset.length));
            }
            return str;
        }
        randomList(a) {
            let idx = Math.floor(Math.random()*a.length)
            return a[idx]
        }
        wait(t) {
            return new Promise(e => setTimeout(e, t))
        }
        done(t = {}) {
            const e = (new Date).getTime(),
            s = (e - this.startTime) / 1e3;
            console.log(`\n${this.name} 运行结束，共运行了 ${s} 秒！`)
            if(this.isSurge() || this.isQuanX() || this.isLoon()) $done(t)
        }
    }(name,env)
}
