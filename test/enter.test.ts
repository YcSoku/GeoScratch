/////// Core //////////////////////////////////
// import eventTest from "./core/event.test"
// import dataTest from './core/data.test'

// eventTest()
// dataTest()


/////// Platformn //////////////////////////////////
// import moduleTest from "./module/module.test";
// moduleTest()

import * as scr from '../src/scratch'
import triangle from "./platform/renderpass";

import computepass from "./platform/computepass";


scr.StartDash().then(() => {
    triangle()
    computepass()
})
