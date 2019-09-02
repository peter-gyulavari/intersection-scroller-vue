import Vue from "vue";
import IntersectionScroller from "./intersection-scroller.vue";

const Components = {
  IntersectionScroller
};

Object.keys(Components).forEach(name => {
  Vue.component(name, Components[name]);
});

export default Components;
