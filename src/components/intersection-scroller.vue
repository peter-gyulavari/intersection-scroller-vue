<template>
  <div>
    <div ref="scrollContainer" id="scrollContainer" :class="containerClass">
      <slot v-for="(item,index) in list" :ref="index" :id="index" :index="index" :item="item"></slot>
    </div>

    <div :class="loaderClass" @click="itemsFn()">
      <q-icon v-if="hasMore" name="fas fa-chevron-down fa-2x" class="bounce q-mt-sm" />
      <p v-else>{{noMoreMessage}}</p>
    </div>
  </div>
</template>

<script>
//eslint-disable-next-line
require("intersection-observer");
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
export default {
  name: "IntersectionScroller",
  props: {
    list: {
      type: Array,
      required: true
    },
    itemsFn: {
      type: Function,
      required: true
    },
    setVisible: {
      type: Function,
      required: true
    },
    containerClass: {
      type: String,
      required: false,
      default: ""
    },
    loaderClass: {
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
    }
  },
  data() {
    return {
      observer: null,
      lastItemsPerRow: null,
      hasMore: true
    };
  },
  methods: {
    async getItems() {
      const indexes = [];

      const newData = await this.itemsFn();
      newData.forEach(data => {
        const index = this.list.findIndex(
          el => el[this.indexBy] === data[this.indexBy]
        );
        indexes.push(index);
      });
      return indexes;
    },
    hasMoreToLoad() {
      const hasMore = this.list.length !== this.itemsCount;

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
              disableBodyScroll(this.$refs.scrollingContainer);
              const indexes = await this.getItems();
              enableBodyScroll(this.$refs.scrollingContainer);
              this.$nextTick(() => {
                indexes.forEach(index => {
                  if (index % getRow.itemsPerRow === 0) {
                    this.observer.observe(
                      document.querySelector(`#item-${index}`)
                    );
                  }
                });
              });
            }

            const shouldBeVisible = [];
            for (let i = 0; i < getRow.itemsPerRow; i++) {
              if (this.list[parseInt(entryId) + i]) {
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
      for (let i = 0; i < this.list.length; i += itemsPerRow) {
        this.observer.observe(document.querySelector(`#item-${i}`));
      }
      this.lastItemsPerRow = itemsPerRow;
    },
    reconfigureObserver() {
      this.observer.disconnect();
      const itemsPerRow = this.getItemsPerRow();
      for (let i = 0; i < this.list.length; i += itemsPerRow) {
        this.observer.observe(document.querySelector(`#item-${i}`));
      }
    },
    getRowAtIndex(index) {
      const itemsPerRow = this.getItemsPerRow();
      const itemsCount = this.itemsCount;
      const allRows = Math.ceil(itemsCount / itemsPerRow);
      const currentRow = Math.floor((index * allRows) / itemsCount);
      const isLastLoadedRow =
        Math.ceil(this.list.length / itemsPerRow) - 1 === currentRow;

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
    }
  },
  created() {
    this.getItems();
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

<style>
.bounce {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
}
</style>