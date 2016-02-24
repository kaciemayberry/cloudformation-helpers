exports.formatForDynamo = function(value, topLevel) {
  var result = undefined;
  if (value == 'true' || value == 'false') {
    result = {'BOOL': value == 'true'}
  } else if (!isNaN(value) && value.trim() != '') {
    result = {'N': value}
  } else if (Array.isArray(value)) {
    var arr = [];
    for (var i = 0; i < value.length; i++) {
      arr.push(exports.formatForDynamo(value[i], false));
    }
    result = {'L': arr};
  } else if (typeof value  === "object") {
    var map = {};
    Object.keys(value).forEach(function(key) {
      map[key] = exports.formatForDynamo(value[key], false)
    });
    if (topLevel) result = map;
    else result = {'M': map}
  } else {
    result = {'S': value}
  }
  return result;
}

exports.formatFromDynamo = function(value) {
  var result = undefined;
  if (typeof value === "string" || typeof value === 'boolean' || typeof value === 'number') {
    result = value;
  } else if (Array.isArray(value)) {
    var arr = [];
    for (var i = 0; i < value.length; i++) {
      arr.push(exports.formatFfromDynamo(value[i]));
    }
    result = arr;
  } else if (typeof value  === "object") {
    var map = {};
    Object.keys(value).forEach(function(key) {
      var v = exports.formatFromDynamo(value[key]);
      switch (key) {
        case 'B':
          throw "Unsupported Mongo type [B]";
        case 'BOOL':
          result = (v == 'true');
          break;
        case 'BS':
          throw "Unsupported Mongo type [BS]";
        case 'L':
          result = v;
          break;
        case 'M':
          result = v;
          break;
        case 'N':
          result = Number(v);
          break;
        case 'NS':
          result = [];
          for (var i = 0; i < v.length; i++) {
            result.push(Number(value[i]));
          };
          break;
        case 'S':
          result = v;
          break;
        case 'SS':
          result = v;
          break;
        default:
          map[key] = v;
      }
      if (result === undefined)
        result = map;
    });
  } else {
    throw "Unrecognized type [" + (typeof value) + "]";
  }
  return result;
}