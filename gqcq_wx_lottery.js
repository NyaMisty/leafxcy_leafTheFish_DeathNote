/*
广汽传祺小程序抽奖

cron: 45 12 29-31 12 *

一次性抽奖, 跑一次就好
抽奖之后需要自己到app-我的-兑奖中心-年末好礼大放送 里面填兑换码
一个号只能填一次兑换码,自己选分数多的去填吧
*/
const $ = new Env('广汽传祺小程序抽奖');
const got = require('got');

const envPrefix = 'gqcqWx'
const envSplitor = ['\n','&','@'] //支持多种分割，但要保证变量里不存在这个字符
const ckNames = [envPrefix+'Cookie'] //支持多变量

const MAX_THREAD = parseInt(process.env[envPrefix+'Thread']) || 3
const DEFAULT_TIMEOUT=8000, DEFAULT_RETRY=3;

const default_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001f30) NetType/WIFI Language/zh_CN miniProgram/wx86a1eb5a53a6973b'
const Origin = 'https://mall.gacmotor.com'
const Referer = 'https://mall.gacmotor.com/act/turntable?id=147&_sasdk=fMTUzNjA1OTE2Mjc5MzM5NDE3Ng'

const channel = 'wx_channel'
const activityId_list = ['147','148','150','152']

const client = got.extend({
    headers:{
        Connection:'keep-alive',
        'User-Agent': default_UA,
        Origin,
        Referer,
    },
    retry: {limit:0},
    timeout: DEFAULT_TIMEOUT,
    followRedirect: false,
})

class BasicClass {
    constructor() {
        this.index = $.userIdx++;
        this.name = '';
    }
    log(msg, opt = {}) {
        var m = '', n = $.userCount.toString().length;;
        if (this.index) m += `账号[${$.padStr(this.index,n)}]`;
        if (this.name) m += `[${this.name}]`;
        $.log(m + msg, opt);
    }
    async request(opt) {
        var resp = null, count = 0;
        var fn = opt.fn || opt.url;
        opt.method = opt?.method?.toUpperCase() || 'GET';
        while (count++ < DEFAULT_RETRY) {
            try {
                await client(opt).then(t => {
                    resp = t
                }, e => {
                    resp = e.response
                });
                if (((resp?.statusCode / 100) | 0) <= 4) break;
            } catch (e) {
                if (e.name == 'TimeoutError') {
                    this.log(`[${fn}]请求超时，重试第${count}次`);
                } else {
                    this.log(`[${fn}]请求错误(${e.message})，重试第${count}次`);
                }
            };
        }
        if (resp == null) return Promise.resolve({statusCode:-1,headers:null,result:null});
        let {statusCode,headers,body} = resp;
        if (body) try {body = JSON.parse(body);} catch {};
        return Promise.resolve({statusCode,headers,result:body})
    }
}
let http = new BasicClass();

class UserClass extends BasicClass {
    constructor(ck) {
        super()
        this.token = ck
        this.headers = {
            token: this.token,
        }
    }
    
    async lottery(activityId) {
        try {
            let options = {
                fn: 'lottery',
                method: 'post',
                url: 'https://mall.gacmotor.com/activity-app/customer/activityPrize/lotter',
                searchParam: {notip:true},
                headers: this.headers,
                json: {activityId,channel},
            }
            let {result} = await this.request(options)
            let code = result?.code
            if(code == '0000') {
                this.log(`抽奖[${activityId}]: ${result?.data?.name}`, {notify:true})
            } else {
                this.log(`抽奖[${activityId}]失败[${code}]: ${result?.msg}`, {notify:true})
            }
        } catch (e) {
            $.log(e)
        } finally {
            return Promise.resolve()
        }
    }
    
    async prizeRecords(activityId) {
        try {
            let options = {
                fn: 'prizeRecords',
                method: 'get',
                url: 'https://mall.gacmotor.com/activity-app/customer/activityPrize/query/prizeRecords',
                searchParam: {activityId},
                headers: this.headers,
            }
            let {result} = await this.request(options)
            let code = result?.code
            if(code == '0000') {
                for(let item of (result?.data||[])) {
                    $.log(`[${item.prizeName}] -- ${item.code}`, {notify:true})
                }
            } else {
                this.log(`查询中奖记录失败`)
            }
        } catch (e) {
            $.log(e)
        } finally {
            return Promise.resolve()
        }
    }
    
    async userTask() {
        for(let id of activityId_list) {
            await this.lottery(id)
        }
    }
    
    async userCheckTask() {
        //for(let id of activityId_list) {
        //   await this.prizeRecords(id)
        //}
        await this.prizeRecords('147')
    }
}

!(async () => {
    $.read_env(UserClass);
    
    $.log('\n------------- 抽奖 -------------')
    await $.threadTask('userTask',MAX_THREAD)
    
    $.log('\n------------- 中奖记录 -------------')
    await $.threadTask('userCheckTask',MAX_THREAD)
})()
.catch((e) => $.log(e))
.finally(() => $.exitNow())

function Env(name) {
    return new class {
        constructor(name) {
            this.name = name;
            this.startTime = Date.now();
            this.log(`[${this.name}]开始运行\n`, {time: true});
            this.notifyStr = [];
            this.notifyFlag = true;
            this.userIdx = 0;
            this.userList = [];
            this.userCount = 0;
        }
        log(msg, options = {}) {
            let opt = {console: true};
            Object.assign(opt, options);
            if (opt.time) {
                let fmt = opt.fmt || 'hh:mm:ss';
                msg = `[${this.time(fmt)}]` + msg;
            }
            if (opt.notify) this.notifyStr.push(msg);
            if (opt.console) console.log(msg);
        }
        read_env(Class) {
            let envStrList = ckNames.map(x => process.env[x]);
            for (let env_str of envStrList.filter(x => !!x)) {
                let sp = envSplitor.filter(x => env_str.includes(x));
                let splitor = sp.length > 0 ? sp[0] : envSplitor[0];
                for (let ck of env_str.split(splitor).filter(x => !!x)) {
                    this.userList.push(new Class(ck));
                }
            }
            this.userCount = this.userList.length;
            if (!this.userCount) {
                this.log(`未找到变量，请检查变量${ckNames.map(x => '['+x+']').join('或')}`, {notify: true});
                return false;
            }
            this.log(`共找到${this.userCount}个账号`);
            return true;
        }
        async threads(taskName, conf, opt = {}) {
            while (conf.idx < $.userList.length) {
                let user = $.userList[conf.idx++];
                await user[taskName](opt);
            }
        }
        async threadTask(taskName, thread) {
            let taskAll = [];
            let taskConf = {idx:0};
            while(thread--) taskAll.push(this.threads(taskName, taskConf));
            await Promise.all(taskAll);
        }
        time(t, x = null) {
            let xt = x ? new Date(x) : new Date;
            let e = {
                "M+": xt.getMonth() + 1,
                "d+": xt.getDate(),
                "h+": xt.getHours(),
                "m+": xt.getMinutes(),
                "s+": xt.getSeconds(),
                "q+": Math.floor((xt.getMonth() + 3) / 3),
                S: this.padStr(xt.getMilliseconds(), 3)
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, (xt.getFullYear() + "").substr(4 - RegExp.$1.length)));
            for(let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length)));
            return t;
        }
        async showmsg() {
            if(!this.notifyFlag) return;
            if(!this.notifyStr.length) return;
            var notify = require('./sendNotify');
            this.log('\n============== 推送 ==============');
            await notify.sendNotify(this.name, this.notifyStr.join('\n'));
        }
        padStr(num, length, opt = {}) {
            let padding = opt.padding || '0';
            let mode = opt.mode || 'l';
            let numStr = String(num);
            let numPad = (length > numStr.length) ? (length - numStr.length) : 0;
            let pads = '';
            for (let i=0; i < numPad; i++) {
                pads += padding;
            }
            if (mode == 'r') {
                numStr = numStr + pads;
            } else {
                numStr = pads + numStr;
            }
            return numStr;
        }
        json2str(obj, c, encode = false) {
            let ret = [];
            for (let keys of Object.keys(obj).sort()) {
                let v = obj[keys];
                if(v && encode) v = encodeURIComponent(v);
                ret.push(keys + '=' + v);
            }
            return ret.join(c);
        }
        str2json(str, decode = false) {
            let ret = {};
            for (let item of str.split('&')) {
                if(!item) continue;
                let idx = item.indexOf('=');
                if(idx == -1) continue;
                let k = item.substr(0, idx);
                let v = item.substr(idx + 1);
                if(decode) v = decodeURIComponent(v);
                ret[k] = v;
            }
            return ret;
        }
        randomPattern(pattern, charset = 'abcdef0123456789') {
            let str = '';
            for (let chars of pattern) {
                if (chars == 'x') {
                    str += charset.charAt(Math.floor(Math.random() * charset.length));
                } else if (chars == 'X') {
                    str += charset.charAt(Math.floor(Math.random() * charset.length)).toUpperCase();
                } else {
                    str += chars;
                }
            }
            return str;
        }
        randomString(len, charset = 'abcdef0123456789') {
            let str = '';
            for (let i = 0; i < len; i++) {
                str += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            return str;
        }
        randomList(a) {
            let idx = Math.floor(Math.random() * a.length);
            return a[idx];
        }
        wait(t) {
            return new Promise(e => setTimeout(e, t));
        }
        async exitNow() {
            await this.showmsg();
            let e = Date.now();
            let s = (e - this.startTime) / 1000;
            this.log('');
            this.log(`[${this.name}]运行结束，共运行了${s}秒`, {time: true});
            process.exit(0);
        }
    }
    (name)
}