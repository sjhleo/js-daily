function Mvvm(options = {}) {
    // vm.$options Vue上是将所有属性挂载到上面
    // 所以我们也同样实现,将所有属性挂载到了$options
    this.$options = options;
    // 初始化computed,将this指向实例
    initComputed.call(this);
    // this._data 这里也和Vue一样
    let data = this._data = this.$options.data;

    // 数据劫持
    observe(data);
    // this 代理了this._data
    for (let key in data) {
        Object.defineProperty(this, key, {
            configurable: true,
            get() {
                return this._data[key];     // 如this.a = {b: 1}
            },
            set(newVal) {
                this._data[key] = newVal;
            }
        });
    }
    new Compile(options.el, this);
    options.mounted.call(this);
}
// 创建一个Observe构造函数
// 写数据劫持的主要逻辑
function Observe(data) {
    // 所谓数据劫持就是给对象增加get,set
    // 先遍历一遍对象再说
    for (let key in data) {     // 把data属性通过defineProperty的方式定义属性
        let dep = new Dep();
        let val = data[key];
        observe(val);   // 递归继续向下找，实现深度的数据劫持
        Object.defineProperty(data, key, {
            configurable: true,
            get() {
                Dep.target && dep.addSub(Dep.target);
                return val;
            },
            set(newVal) {   // 更改值的时候
                if (val === newVal) {   // 设置的值和以前值一样就不理它
                    return;
                }
                val = newVal;   // 如果以后再获取值(get)的时候，将刚才设置的值再返回去
                observe(newVal);    // 当设置为新值后，也需要把新值再去定义成属性
                dep.notify();   // 让所有watcher的update方法执行即可
            }
        });
    }
}
function observe(data) {
    // 如果不是对象的话就直接return掉
    // 防止递归溢出
    if (!data || typeof data !== 'object') return;
    return new Observe(data);
}
// 创建Compile构造函数
function Compile(el, vm) {
    // 将el挂载到实例上方便调用
    vm.$el = document.querySelector(el);
    // 在el范围里将内容都拿到，当然不能一个一个的拿
    // 可以选择移到内存中去然后放入文档碎片中，节省开销
    let fragment = document.createDocumentFragment();

    while (child = vm.$el.firstChild) {
        fragment.appendChild(child);    // 此时将el中的内容放入内存中
    }
    // 对el里面的内容进行替换
    function replace(frag) {
        Array.from(frag.childNodes).forEach(node => {
            let txt = node.textContent;
            let reg = /\{\{(.*?)\}\}/g;   // 正则匹配{{}}
            if (node.nodeType === 1) {  // 元素节点
                let nodeAttr = node.attributes; // 获取dom上的所有属性,是个类数组
                Array.from(nodeAttr).forEach(attr => {
                    let name = attr.name;   // v-model  type
                    let exp = attr.value;   // c        text
                    let arr = exp.split('.');
                    let val = vm;
                    arr.forEach(key => {
                        val = val[key.trim()];   // 通过get获取到新的值
                    });
                    if (name.includes('v-')) {
                        node.value = val;   // this.c 为 2
                    }
                    // 监听变化
                    new Watcher(vm, exp, function (newVal) {
                        node.value = newVal;   // 当watcher触发时会自动将内容放进输入框中
                    });

                    node.addEventListener('input', e => {
                        let newVal = e.target.value;
                        // 相当于给this.c赋了一个新值
                        // 而值的改变会调用set，set中又会调用notify，notify中调用watcher的update方法实现了更新
                        // vm[exp] = newVal;
                        let keys = JSON.parse(JSON.stringify(arr));
                        let endKey = keys.splice(-1, 1);
                        let node = keys.reduce((res, i) => res[i], vm)
                        node[endKey[0]] = newVal;
                    });
                });
            }


            if (node.nodeType === 3 && reg.test(txt)) { // 即是文本节点又有大括号的情况{{}}
                console.log(RegExp.$1); // 匹配到的第一个分组 如： a.b, c
                let arr = RegExp.$1.split('.');
                let val = vm;
                arr.forEach(key => {
                    val = val[key.trim()];     // 如this.a.b
                });
                // 用trim方法去除一下首尾空格
                node.textContent = txt.replace(reg, val).trim();
                new Watcher(vm, RegExp.$1, newVal => {
                    node.textContent = txt.replace(reg, newVal).trim();
                });
            }
            // 如果还有子节点，继续递归replace
            if (node.childNodes && node.childNodes.length) {
                replace(node);
            }
        });
    }

    replace(fragment);  // 替换内容

    vm.$el.appendChild(fragment);   // 再将文档碎片放入el中
}

// 发布订阅模式  订阅和发布 如[fn1, fn2, fn3]
function Dep() {
    // 一个数组(存放函数的事件池)
    this.subs = [];
}
Dep.prototype = {
    addSub(sub) {
        this.subs.push(sub);
    },
    notify() {
        // 绑定的方法，都有一个update方法
        this.subs.forEach(sub => sub.update());
    }
};
// 监听函数
// 通过Watcher这个类创建的实例，都拥有update方法
// 重写Watcher构造函数
function Watcher(vm, exp, fn) {
    this.fn = fn;
    this.vm = vm;
    this.exp = exp;
    // 添加一个事件
    // 这里我们先定义一个属性
    Dep.target = this;
    let arr = exp.split('.');
    let val = vm;
    arr.forEach(key => {    // 取值
        val = val[key.trim()];     // 获取到this.a.b，默认就会调用get方法
    });
    Dep.target = null;
}
Watcher.prototype.update = function () {
    // notify的时候值已经更改了
    // 再通过vm, exp来获取新的值
    let arr = this.exp.split('.');
    let val = this.vm;
    arr.forEach(key => {
        val = val[key.trim()];   // 通过get获取到新的值
    });
    this.fn(val);   // 将每次拿到的新值去替换{{}}的内容即可
};
function initComputed() {
    let vm = this;
    let computed = this.$options.computed;  // 从options上拿到computed属性   {sum: ƒ, noop: ƒ}
    // 得到的都是对象的key可以通过Object.keys转化为数组
    Object.keys(computed).forEach(key => {  // key就是albumText
        Object.defineProperty(vm, key, {
            // 这里判断是computed里的key是对象还是函数
            // 如果是函数直接就会调get方法
            // 如果是对象的话，手动调一下get方法即可
            // 如： albumText() {return this.name + this.theme;},他们获取name和theme的值就会调用get方法
            // 所以不需要new Watcher去监听变化了
            get: typeof computed[key] === 'function' ? computed[key] : computed[key].get,
            set() { }
        });
    });
}


