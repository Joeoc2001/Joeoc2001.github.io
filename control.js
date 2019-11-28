"use strict";

function Control(getElement, getValue, bindToChange) {
    this.getElement = getElement;
    this.getValue = getValue;
    this.bindToChange = bindToChange;
}

function SliderControl(text, min, max, init) {
    init = Math.max(Math.min(init, max), min); // Bound init to min & max

    // Create element referred to by this control
    let element = document.createElement("input");
    element.type = "slider";
    element.min = min;
    element.max = max;
    element.value = init;

    let getElement = () => {
        return element;
    };

    let getValue = () => {
        return element.value;
    };

    let bindToChange = (f) => {
        element.onchange = f;
    };

    // Invoke superclass
    Control.call(this, getElement, getValue, bindToChange);
}

function ButtonControl(text) {
    // Create element referred to by this control
    let element = document.createElement("input");
    element.type = "button";
    element.value = text;

    let getElement = () => {
        return element;
    };

    let getValue = () => {};

    let bindToChange = (f) => {
        element.onclick = f;
    };

    // Invoke superclass
    Control.call(this, getElement, getValue, bindToChange);
}

function generateControl(data) {
    switch(data.type) {
        case "slider":
            return new SliderControl(data.text, data.min, data.max, data.default);
        case "button":
            return new SliderControl(data.text);
    }
}

function generateControls(data) {
    let controls = {};

    for (let i = 0; i < data.length; i++) {
        let controlData = data[i];
        controls[controlData.name] = generateControl(controlData);
    }

    return controls;
}