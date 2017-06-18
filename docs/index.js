Vue.component('aircraft-control', {
  template: '#aircraft-control',
  props: ['control'],

  computed: {
    labelColor: function() {
      switch (this.control.control_type) {
        case 'selector':
          return 'blue';
        case 'analog_gauge':
          return 'orange';
        case 'limited_dial':
          return 'olive';
        case 'display':
          return 'pink';
        case 'led':
          return 'teal';
        default:
          return 'grey';
      }
    },

    controlType: function() {
      return this.control.control_type.replace(/_/g, ' ');
    }
  }
});

new Vue({
  el: '#app',

  data: {
    filter: '',
    aircraftData: window.docdata,
    selectedAircraft: Object.keys(window.docdata)
  },

  methods: {
    onFilterIconClick: function() {
      if (this.filter) {
        this.filter = '';
      }
    },

    selectAircraft: function(aircraftName) {
      this.selectedAircraft = [aircraftName];
    },

    selectAllAircraft: function() {
      this.selectedAircraft = this.aircraftNames;
    },

    isAircraftSelected: function(aircraftName) {
      return this.selectedAircraft.includes(aircraftName);
    },

    // Whether any of the categories in an aircraft matches the filter.
    isAircraftMatch: function(categories) {
      return Object.values(categories).some(this.isCategoryMatch);
    },

    // Whether at least one of the controls in a category matches the filter.
    isCategoryMatch: function(category) {
      return Object.values(category).some(this.isControlMatch);
    },

    // Whether the control matches the filter. If the control's category, identifier, or description matches the filter,
    // we should show the control.
    isControlMatch: function(control) {
      var filter = this.filter;
      var categoryMatches = control.category.toLowerCase().includes(filter);
      var identifierMatches = control.identifier.toLowerCase().includes(filter);
      var descriptionMatches = (control.description || '').toLowerCase().includes(filter);
      return categoryMatches || identifierMatches || descriptionMatches;
    }
  },

  computed: {
    filterIcon: function() {
      return this.filter ? 'remove' : 'search';
    },

    aircraftNames: function() {
      return Object.keys(window.docdata);
    }
  }
});

$('.ui.sticky').sticky();
