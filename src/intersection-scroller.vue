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
    listChanged: {
      type: Boolean,
      required: true
    },
    itemsGap: {
      type: Number,
      required: false,
      default: 0
    }
  },
  data() {
    return {
      observer: null,
      lastItemsPerRow: null,
      innerList: [],
      loading: false
    };
  },

  watch: {
    listChanged: function() {
      if (this.listChanged) {
        this.loading = false;

        const indexes = [];
        const length = this.innerList.length;
        const diff = this.list.length - this.innerList.length;
        for (let i = length; i < diff + length; i++) {
          const element = this.list[i];
          this.innerList.push(element);
          indexes.push(i);
        }

        const itemsPerRow = this.getItemsPerRow();

        this.$emit("updated");

        this.$nextTick(() => {
          indexes.forEach(index => {
            if (index % itemsPerRow === 0) {
              this.observer.observe(document.querySelector(`#item-${index}`));
            }
          });
        });
      }
    }
  },
  computed: {
    hasMore() {
      const hasMore = this.innerList.length !== this.itemsCount;
      return hasMore ? true : false;
    }
  },
  methods: {
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
              this.hasMore
            ) {
              this.loading = true;
              this.$emit("itemsFn", this.getItemsPerRow());
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
        Math.ceil(this.innerList.length / itemsPerRow) - 1 === currentRow + 1;
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
        itemsPerRow = Math.floor(width / this.itemWidth);
      }

      const trueWidth = width - itemsPerRow * this.itemsGap;

      itemsPerRow = Math.floor(trueWidth / this.itemWidth);
      return itemsPerRow;
    },
    setVisible(elements) {
      elements.forEach(el => {
        this.$set(this.innerList[el.index], "isVisible", el.isVisible);
      });
    }
  },

  mounted() {
    try {
      this.loading = true;
      this.$emit("itemsFn", this.getItemsPerRow());
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