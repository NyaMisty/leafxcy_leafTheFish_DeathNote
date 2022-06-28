/*
花花阅读

扫码阅读：https://raw.githubusercontent.com/leafTheFish/DeathNote/main/hhyd.png
阅读链接：http://renqizhi.cn/user/huahua.html?mid=533RGK5XY&1656171931077

自动阅读，满3毛自动提现
每天最好手动读两篇，否则容易被检测，当天会没有阅读时间

变量：
hhydCookie：必填，账号ck，捉包把u.wyexin.cn请求body里的un和token填进去，多账号换行隔开。格式 export hhydCookie="un=xxxxx&token=yyyyyyy"


重写：直接点进去链接就能获取CK
[task_local]
#花花阅读
22 0,6-22/2 * * * https://raw.githubusercontent.com/leafTheFish/DeathNote/main/hhyd.js, tag=花花阅读, enabled=true
[rewrite_local]
http://u.wyexin.cn/api/user/info url script-request-header https://raw.githubusercontent.com/leafTheFish/DeathNote/main/hhyd.js
[MITM]
hostname = u.wyexin.cn
*/
const $ = new Env("花花阅读");

let envSplitor = ['\n']
let httpResult, httpReq, httpResp

let userCookie = ($.isNode() ? process.env.hhydCookie : $.getdata('hhydCookie')) || '';

let userList = []
let userIdx = 0
let userCount = 0

let defaultUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.23(0x18001729) NetType/WIFI Language/zh_CN'

let MAX_WITHDRAW_FAIL = 3
let withdrawList = [50000,10000,5000,3000]
///////////////////////////////////////////////////////////////////
class UserInfo {
    constructor(str) {
        this.index = ++userIdx
        this.name = this.index
        this.valid = false
        this.timestamp = 0
        this.canRead = false
        this.canWithdraw = true
        this.withdrawFailCount = 0
        
        try {
            this.param = $.str2json(str)
            this.ckValid = true
        } catch (e) {
            this.ckValid = false
            $.logAndNotify(`账号[${this.index}]CK无效，请检查格式`)
        }
    }
    
    async getUserInfo() {
        try {
            let url = `http://u.wyexin.cn/api/user/info`
            let body = JSON.stringify({"un":this.param.un,"token":this.param.token,"pageSize":20})
            this.timestamp = Date.now()
            let referer =`http://u.wyexin.cn/user/huahua.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                this.valid = true
                this.uid = result.result.uid
                console.log(`账号[${this.name}]今天已读${result.result.read}/${result.result.max}，剩余可读: ${result.result.leftCount}，剩余花币: ${result.result.moneyCurrent}`)
                if(result.result.leftCount > 0) {
                    if(result?.result?.hopeNo?.status==70) {
                        let cdtime = (new Date(result.result.hopeNo.ts)).getTime() + 60*60*1000
                        let nowtime = Date.now()
                        let delta = new Date(cdtime - nowtime)
                        console.log(`账号[${this.name}]阅读冷却还有${delta.getMinutes()}分${delta.getSeconds()}秒`)
                    } /*else if(result?.result?.hopeNo?.status==50) {
                        console.log(`账号[${this.name}]今天未过检测，请手动阅读两篇再跑脚本`)
                    } */else {
                        this.canRead = true
                    }
                } else {
                    console.log(`账号[${this.name}]今天已完成阅读`) 
                }
            } else {
                $.logAndNotify(`账号[${this.name}]查询账户失败，CK可能失效: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async getExpire() {
        try {
            let url = `https://u.cocozx.cn/api/user/expire`
            let body = JSON.stringify({"un":this.param.un,"token":this.param.token,"mid":""})
            this.timestamp = Date.now()
            let referer =`http://u.wyexin.cn/user/huahua.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async statAccess() {
        try {
            let url = `http://u.wyexin.cn/api/user/statAccess`
            let body = JSON.stringify({"un":this.param.un,"token":this.param.token,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/huahua.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                await this.getMsg()
            } else {
                console.log(`账号[${this.name}]statAccess失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async getMsg() {
        try {
            let url = `http://u.wyexin.cn/api/user/getMsg`
            let body = JSON.stringify({"un":this.param.un,"token":this.param.token,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/huahua.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                let waittime = Math.floor(Math.random()*2000) + 1000;
                await $.wait(waittime);
                this.readFlag = true
                while(this.readFlag) {
                    this.readFlag = false
                    await this.readd();
                }
            } else {
                console.log(`账号[${this.name}]getMsg失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async readd() {
        try {
            let url = `http://u.wyexin.cn/api/user/readd`
            let body = JSON.stringify({"code":"xpz111","un":this.param.un,"token":this.param.token,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/h.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                let waittime = Math.floor(Math.random()*5000) + 7000;
                console.log(`账号[${this.name}]开始阅读，等待${waittime/1000}秒...`)
                await $.wait(waittime);
                await this.submitt();
            } else {
                console.log(`账号[${this.name}]开始阅读失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async submitt() {
        try {
            let url = `http://u.wyexin.cn/api/user/submitt`
            let body = JSON.stringify({"code":"xpz222","un":this.param.un,"token":this.param.token,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/h.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                if(result?.result?.progress || result?.result?.progress == 0) {
                    let str = result.result.progress>0 ? `还可以阅读${result.result.progress}篇` : `进入阅读冷却时间`
                    console.log(`账号[${this.name}]完成阅读，获得${result.result.val}花币，${str}`)
                    if(result?.result?.progress>0) {
                        this.readFlag = true
                        let waittime = Math.floor(Math.random()*1000) + 500;
                        await $.wait(waittime);
                    }
                }
            } else {
                console.log(`账号[${this.name}]完成阅读失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async readRed() {
        try {
            let url = `http://u.wyexin.cn/api/user/readRed`
            let body = JSON.stringify({"un":this.param.un,"token":this.param.token,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/h.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                console.log(`账号[${this.name}]抽奖: ${result.msg}`)
            } else {
                console.log(`账号[${this.name}]抽奖失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async getInfo() {
        try {
            let url = `https://u.cocozx.cn/api/user/info`
            let body = JSON.stringify({"un":this.param.un,"token":this.param.token,"mid":""})
            let referer =`https://servicewechat.com/wxec9f2c3d0bf86c6b/3/page-frame.html`
            let urlObject = populateUrlObject(url,referer,body)
            delete urlObject.headers["X-Requested-With"]
            delete urlObject.headers["Origin"]
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                this.money = result.result.moneyCurrent
                this.tmpkey = result.result.tmpkey
                $.logAndNotify(`账号[${this.name}]今天已读${result.result.read}/${result.result.max}，剩余花币: ${result.result.moneyCurrent}`)
                if(result.result.readRed > 0) {
                    for(let i=0; i<result.result.readRed; i++) {
                        let waittime = Math.floor(Math.random()*1000) + 1000;
                        await $.wait(waittime);
                        await this.readRed();
                    }
                }
                for(let val of withdrawList) {
                    while(this.money >= val && this.canWithdraw) {
                        let waittime = Math.floor(Math.random()*5000) + 8000;
                        await $.wait(waittime);
                        await this.withdraw(val);
                    }
                    if(!this.canWithdraw) break;
                    if(this.withdrawFailCount >= MAX_WITHDRAW_FAIL) break;
                }
            } else {
                console.log(`账号[${this.name}]查询账户失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async withdraw(val) {
        try {
            let url = `https://u.cocozx.cn/api/user/wd`
            let body = JSON.stringify({"val":val,"un":this.param.un,"token":this.param.token,"mid":""})
            let referer =`https://servicewechat.com/wxec9f2c3d0bf86c6b/3/page-frame.html`
            let urlObject = populateUrlObject(url,referer,body)
            delete urlObject.headers["X-Requested-With"]
            delete urlObject.headers["Origin"]
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                this.money -= val
                $.logAndNotify(`账号[${this.name}]成功提现${val/10000}元`)
            } else {
                if(result.msg.indexOf('请明天再来') > -1) {
                    this.canWithdraw = false
                } else {
                    this.withdrawFailCount++
                }
                $.logAndNotify(`账号[${this.name}]提现${val/10000}元失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async psmoney() {
        try {
            let url = `http://u.cocozx.cn/api/user/psmoney`
            let body = JSON.stringify({"mid":this.uid,"un":null,"token":null,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/huahua.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                console.log(`账号[${this.name}]可以收取下级收益${result.result.pmoney/10000}元`)
                if(result.result.pmoney > 0) {
                    await this.psmoneyc()
                }
            } else {
                console.log(`账号[${this.name}]查询下级收益失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
    
    async psmoneyc() {
        try {
            let url = `http://u.cocozx.cn/api/user/psmoneyc`
            let body = JSON.stringify({"mid":this.uid,"un":null,"token":null,"pageSize":20})
            let referer =`http://u.wyexin.cn/user/huahua.html?${this.timestamp}`
            let urlObject = populateUrlObject(url,referer,body)
            await httpRequest('post',urlObject)
            let result = httpResult;
            if(!result) return
            //console.log(result)
            if(result.code==0) {
                console.log(`账号[${this.name}]收取下级收益${result.result.val/10000}元成功`)
            } else {
                console.log(`账号[${this.name}]收取下级收益失败: ${result.msg}`)
            }
        } catch(e) {
            console.log(e)
        } finally {
            return Promise.resolve(1);
        }
    }
}

!(async () => {
    if (typeof $request !== "undefined") {
        await GetRewrite()
    }else {
        if(!(await checkEnv())) return;
        
        let taskall = []
        let validList = userList.filter(x => x.ckValid)
        
        if(validList.length > 0) {
            console.log('\n-------------- 查询 --------------')
            taskall = []
            for(let user of validList) {
                taskall.push(user.getUserInfo())
            }
            await Promise.all(taskall)
            validList = validList.filter(x => x.valid)
            
            if(validList.length > 0) {
                console.log('\n-------------- 阅读 --------------')
                taskall = []
                for(let user of validList.filter(x => x.canRead)) {
                    taskall.push(user.statAccess())
                }
                await Promise.all(taskall)
                
                console.log('\n-------------- 下级收益 --------------')
                taskall = []
                for(let user of validList) {
                    taskall.push(user.psmoney())
                }
                await Promise.all(taskall)
                
                console.log('\n-------------- 花币 --------------')
                taskall = []
                for(let user of validList) {
                    taskall.push(user.getInfo())
                }
                await Promise.all(taskall)
            }
        }
        
        await $.showmsg();
    }
})()
.catch((e) => console.log(e))
.finally(() => $.done())

///////////////////////////////////////////////////////////////////
async function GetRewrite() {
    if($request.url.indexOf(`api/user/info`) > -1) {
        if(!$request.body) return;
        let body = JSON.parse($request.body)
        if(!body.un || !body.token) return;
        let ck = `un=${body.un}&token=${body.token}`
        let un = `un=${body.un}`
        
        if(userCookie) {
            if(userCookie.indexOf(ck) > -1) return;
            if(userCookie.indexOf(un) == -1) {
                userCookie = userCookie + '\n' + ck
                $.setdata(userCookie, 'hhydCookie');
                let ckList = userCookie.split('\n')
                $.msg(`获取第${ckList.length}个ck成功: ${ck}`)
            } else {
                let idx = 0
                let ckList = userCookie.split('\n')
                for(idx in ckList) {
                    let cks = ckList[Number(idx)]
                    if(cks.indexOf(un) > -1) {
                        ckList[Number(idx)] = ck
                        break;
                    }
                }
                userCookie = ckList.join('\n')
                $.setdata(userCookie, 'hhydCookie');
                $.msg(`更新第${Number(idx)+1}个ck成功: ${ck}`)
            }
        } else {
            $.setdata(ck, 'hhydCookie');
            $.msg(`获取第1个ck成功: ${ck}`)
        }
    }
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
function populateUrlObject(url,referer,body=''){
    let host = url.replace('//','/').split('/')[1]
    let urlObject = {
        url: url,
        headers: {
            'Host': host,
            'Connection': 'keep-alive',
            'Referer': referer,
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'http://u.wyexin.cn',
            'User-Agent': defaultUA,
        },
        timeout: 5000,
    }
    if(body) {
        urlObject.body = body
        urlObject.headers['Content-Type'] =  'application/json; charset=utf-8'
        urlObject.headers['Content-Length'] = urlObject.body ? urlObject.body.length : 0
    }
    return urlObject;
}

async function httpRequest(method,url) {
    httpResult = null, httpReq = null, httpResp = null;
    return new Promise((resolve) => {
        $.send(method, url, async (err, req, resp) => {
            try {
                httpReq = req;
                httpResp = resp;
                if (err) {
                    console.log(`${method}请求失败`);
                    console.log(JSON.stringify(err));
                } else {
                    if(resp.body) {
                        if(typeof resp.body == "object") {
                            httpResult = resp.body;
                        } else {
                            try {
                                httpResult = JSON.parse(resp.body);
                            } catch (e) {
                                httpResult = resp.body;
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve();
            }
        });
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
                        response: i
                    } = t;
                    e(s, i, i && i.body)
                })
            }
        }
        time(t) {
            let e = {
                "M+": (new Date).getMonth() + 1,
                "d+": (new Date).getDate(),
                "h+": (new Date).getHours(),
                "m+": (new Date).getMinutes(),
                "s+": (new Date).getSeconds(),
                "q+": Math.floor(((new Date).getMonth() + 3) / 3),
                S: (new Date).getMilliseconds()
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length)));
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
