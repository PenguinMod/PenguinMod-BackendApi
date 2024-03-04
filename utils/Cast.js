class Cast {
    /**
     * Treats NaN as 0.
     * @param {*} value Value to cast to number.
     * @return {number} The casted number value.
     */
    static toNumber(value) {
        // If value is already a number we don't need to coerce it with
        // Number().
        if (typeof value === 'number') {
            // Treat NaN as 0 when needed as a number.
            // E.g., 0 + NaN -> 0.
            if (Number.isNaN(value)) {
                return 0;
            }
            return value;
        }
        const n = Number(value);
        if (Number.isNaN(n)) {
            // Treat NaN as 0 when needed as a number.
            // E.g., 0 + NaN -> 0.
            return 0;
        }
        return n;
    }

    /**
     * Treats some string values differently from JavaScript.
     * @param {*} value Value to cast to boolean.
     * @return {boolean} The casted boolean value.
     */
    static toBoolean(value) {
        // Already a boolean?
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            // These specific strings are treated as false.
            if ((value === '') ||
                (value === '0') ||
                (value.toLowerCase() === 'false')) {
                return false;
            }
            // All other strings treated as true.
            return true;
        }
        // Coerce other values and numbers.
        return Boolean(value);
    }

    /**
     * @param {*} value Value to cast to string.
     * @return {string} The casted string value.
     */
    static toString(value) {
        return String(value);
    }

    /**
     * Converts Data URLs to Buffers.
     * @todo Move this to another class
     * @param {string} dataUrl Value to cast to string.
     * @return {Buffer} The new buffer.
     */
    static dataURLToBuffer(dataUrl) {
        const stringed = Cast.toString(dataUrl);
        if (!stringed.startsWith('data:')) return null;
        if (!stringed.includes(';base64,')) return null;
        const split = stringed.split(",");
        const buffer = Buffer.from(split[1], 'base64');
        return buffer;
    }

    /**
     * Determine if the argument is a white space string (or null / empty).
     * @param {*} val value to check.
     * @return {boolean} True if the argument is all white spaces or null / empty.
     */
    static isWhiteSpace(val) {
        return val === null || (typeof val === 'string' && val.trim().length === 0);
    }

    /**
     * Determine if the argument number represents a round integer.
     * @param {*} val Value to check.
     * @return {boolean} True if number looks like an integer.
     */
    static isInt(val) {
        // Values that are already numbers.
        if (typeof val === 'number') {
            if (isNaN(val)) { // NaN is considered an integer.
                return true;
            }
            // True if it's "round" (e.g., 2.0 and 2).
            return val === Math.floor(val);
        } else if (typeof val === 'boolean') {
            // `True` and `false` always represent integer after cast.
            return true;
        } else if (typeof val === 'string') {
            // If it contains a decimal point, don't consider it an int.
            return val.indexOf('.') < 0;
        }
        return false;
    }

    /**
     * Checks if the value is an array buffer.
     * Important to know that this should only be used on values from a request body.
     * @param {*} val A value from a request body.
     * @returns {boolean}
     */
    static isArrayBuffer(val) {
        if (!val) return false;
        return typeof val.transfer === 'function';
    }

    /**
     * Checks if the value is a string.
     * @returns {boolean}
     */
    static isString(val) {
        return typeof val === 'string';
    }
}

module.exports = Cast;