// 第一种实现
function sub_curry(fn) {
    let args = [].slice.call(arguments, 1);
    return function () {
        return fn.apply(this, args.concat([].slice.call(arguments)));
    }
}
function curry(fn, length) {
    length = length || fn.length;
    return function () {
        if (arguments.length < length) {
            let combined = [fn].concat([].slice.call(arguments));
            return curry(sub_curry.apply(this, combined), length - arguments.length);
        } else {
            return fn.apply(this, arguments);
        }
    }
}
// 第二种
function curry(fn, args = []) {
    let length = fn.length;
    return function () {
        let _args = args.slice(0);
        _args = _args.concat([].slice.call(arguments));
        if (_args.length < length) {
            return curry(fn, _args);
        } else {
            return fn.apply(this, _args);
        }
    }
}