function deepClone(obj) {
    // 使用WeakMap而不是map 是在如果对象只被weakMap引用时 会被回收 
    let map = new WeakMap();
    function clone(obj) {
        if (typeof obj != "object") return obj;
        let newObj = map.get(obj);
        if (newObj) {
            return newObj;
        }
        newObj = obj instanceof Array ? [] : {};
        map.set(obj, newObj);
        for (key in obj) {
            if (!obj.hasOwnProperty(key)) return;
            if (typeof obj[key] == "object") {
                newObj[key] = clone(obj[key])
            } else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }
    return clone(obj);
}
