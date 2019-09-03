<template>
  <div>
    <div ref="scrollContainer" id="scrollContainer" :class="containerClass">
      <slot v-for="(item,index) in innerList" :ref="index" :id="index" :index="index" :item="item"></slot>
    </div>

    <div :class="iconContainerClass">
      <i v-if="loading" :class="loadingIconClass"></i>
      <i v-if="hasMore && !loading" :class="loadMoreClass" @click="$emit('itemsFn')" />
      <p v-if="!hasMore && !loading">{{noMoreMessage}}</p>
    </div>
  </div>
</template>

<script>
//eslint-disable-next-line
require("intersection-observer");
export default {
  name: "IntersectionScroller",
  props: {
    list: {
      type: Array,
      required: true
    },
    containerClass: {
      type: String,
      required: false,
      default: ""
    },
    iconContainerClass: {
      type: String,
      required: false,
      default: ""
    },
    loadingIconClass: {
      type: String,
      required: false,
      default: ""
    },
    loadMoreClass: {
      type: String,
      required: false,
      default: ""
    },
    itemsCount: {
      type: Number,
      required: true
    },
    itemWidth: {
      type: Number,
      required: true
    },
    itemOffset: {
      type: Number,
      required: false,
      default: 100
    },
    itemsPerPage: {
      type: Number,
      required: true
    },
    noMoreMessage: {
      type: String,
      required: false,
      default: "No more data..."
    },
    indexBy: {
      type: String,
      required: false,
      default: "id"
    },
    bodyScroll: {
      type: Boolean,
      required: false,
      default: true
    },
    listChanged: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      observer: null,
      lastItemsPerRow: null,
      hasMore: true,
      innerList: [],
      loading: false
    };
  },
  watch: {
    listChanged: function() {
      if (this.listChanged) {
        this.loading = false;
        const differences = this.list.filter(e => {
          return !this.innerList.some(
            item => item[this.indexBy] === e[this.indexBy]
          );
        });
        this.innerList.push(...differences);

        this.$nextTick(() => {
          const indexes = [];
          const itemsPerRow = this.getItemsPerRow();

          differences.forEach(element => {
            const index = this.innerList.findIndex(
              el => el[this.indexBy] === element[this.indexBy]
            );
            indexes.push(index);
          });
          indexes.forEach(index => {
            if (index % itemsPerRow === 0) {
              this.observer.observe(document.querySelector(`#item-${index}`));
            }
          });
          this.$emit("updated");
        });
      }
    }
  },
  methods: {
    hasMoreToLoad() {
      const hasMore = this.innerList.length !== this.itemsCount;

      if (!hasMore) this.hasMore = false;

      return hasMore;
    },
    initObserver() {
      const options = {};

      this.observer = new IntersectionObserver(async entries => {
        await Promise.all(
          entries.map(async entry => {
            const entryId = entry.target.id.split("-")[1];

            const getRow = this.getRowAtIndex(entryId);
            if (this.lastItemsPerRow !== getRow.itemsPerRow) {
              this.lastItemsPerRow = getRow.itemsPerRow;
              this.reconfigureObserver();
            }
            if (
              getRow.isLastLoadedRow &&
              entry.isIntersecting &&
              this.hasMoreToLoad()
            ) {
              this.loading = true;
              this.$emit("itemsFn");
            }

            const shouldBeVisible = [];
            for (let i = 0; i < getRow.itemsPerRow; i++) {
              if (this.innerList[parseInt(entryId) + i]) {
                shouldBeVisible.push({
                  isVisible: entry.isIntersecting,
                  index: parseInt(entryId) + i
                });
              }
            }
            this.setVisible(shouldBeVisible);
          })
        );
      }, options);
      const itemsPerRow = this.getItemsPerRow();
      for (let i = 0; i < this.innerList.length; i += itemsPerRow) {
        this.observer.observe(document.querySelector(`#item-${i}`));
      }
      this.lastItemsPerRow = itemsPerRow;
    },
    reconfigureObserver() {
      this.observer.disconnect();
      const itemsPerRow = this.getItemsPerRow();
      for (let i = 0; i < this.innerList.length; i += itemsPerRow) {
        this.observer.observe(document.querySelector(`#item-${i}`));
      }
    },
    getRowAtIndex(index) {
      const itemsPerRow = this.getItemsPerRow();
      const itemsCount = this.itemsCount;
      const allRows = Math.ceil(itemsCount / itemsPerRow);
      const currentRow = Math.floor((index * allRows) / itemsCount);
      const isLastLoadedRow =
        Math.ceil(this.innerList.length / itemsPerRow) - 1 === currentRow;

      const allPages = Math.ceil(itemsCount / this.itemsPerPage);
      const allRowsOnPage = Math.ceil(this.itemsPerPage / itemsPerRow);
      const nonIndexCurrentRow = currentRow + 1;
      const onPage = Math.ceil(nonIndexCurrentRow / allRowsOnPage);
      return {
        itemsPerRow: itemsPerRow,
        allRows: allRows,
        currentRow: currentRow,
        isLastLoadedRow: isLastLoadedRow,
        allPages: allPages,
        onPage: onPage
      };
    },
    getItemsPerRow() {
      let itemsPerRow;

      const scrollContainer = this.$refs.scrollContainer;
      const width = scrollContainer.offsetWidth;
      if (width) {
        itemsPerRow = Math.floor((width - this.itemOffset) / this.itemWidth);
      }
      return itemsPerRow;
    },
    setVisible(elements) {
      elements.forEach(el => {
        this.$set(this.innerList[el.index], "isVisible", el.isVisible);
      });
    }
  },
  created() {
    this.loading = true;
    this.$emit("itemsFn");
  },
  mounted() {
    try {
      this.initObserver();
    } catch (error) {
      throw error;
    }
  },
  destroyed() {
    if (this.observer) this.observer.disconnect();
  }
};
</script>