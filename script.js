'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription(d) {
    // prettier-ignore
    if (d) {
      this.date = d;
    }
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence, desc = false) {
    super(coords, distance, duration);
    this.calcPace();
    this._setDescription(desc);
    this.cadence = cadence;
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain, desc = false) {
    super(coords, distance, duration);
    this.calcSpeed();
    console.log(desc);
    this._setDescription(desc);
    this.elevationGain = elevationGain;
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run = new Running([35, -12], 5.2, 24, 178);
// const cycling = new Cycling([35, -12], 5.2, 24, 178);
// console.log(run, cycling);

//////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
// const workoutHead = document.querySelector(`.workout__head`);
const map = document.querySelector(`#map`);
const editForm = document.querySelector(`.editForm`);
const inputEditType = editForm.querySelector('.form__input--type');
const inputEditDistance = editForm.querySelector('.form__input--distance');
const inputEditDuration = editForm.querySelector('.form__input--duration');
const inputEditCadence = editForm.querySelector('.form__input--cadence');
const inputEditElevation = editForm.querySelector('.form__input--elevation');
const deletingForm = document.querySelector('.delete-confirmation');

class App {
  #map;
  #coords = [];
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #workoutMarkers = [];
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    this._checkWorkouts();

    // Attach event handlers
    form.addEventListener(`submit`, this._newWorkout.bind(this));

    inputType.addEventListener(`change`, this._toggleElevationField);

    editForm
      .querySelector('.form__input--type')
      .addEventListener(`change`, this._toggleEditFormElevationField);

    editForm.addEventListener(`submit`, this._editWorkout.bind(this));

    // Click event
    document.body.addEventListener(`click`, this._clicksHandle.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#coords = [latitude, longitude];
    this.#map = L.map('map').setView(this.#coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on(`click`, this._showForm.bind(this));

    // Render markers on map from local storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;
    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(() => (form.style.display = `grid`), 1000);
  }

  _hideEditForm() {
    // Empty inputs
    // prettier-ignore
    // inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;
    editForm.style.display = `none`;
    editForm.classList.add(`hidden`);
    setTimeout(() => (editForm.style.display = `grid`), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _toggleEditFormElevationField() {
    editForm
      .querySelector('.form__input--elevation')
      .closest(`.form__row`)
      .classList.toggle(`form__row--hidden`);
    editForm
      .querySelector('.form__input--cadence')
      .closest(`.form__row`)
      .classList.toggle(`form__row--hidden`);
  }

  //////////////////////////////////////////////////////////////
  // When is toggle changing the value empty !!!!!!!!!!!!
  //////////////////////////////////////////////////////////

  _changeEditFormElevationField(e) {
    if (e === `running`) {
      editForm
        .querySelector('.form__input--elevation')
        .closest(`.form__row`)
        .classList.add(`form__row--hidden`);
      editForm
        .querySelector('.form__input--cadence')
        .closest(`.form__row`)
        .classList.remove(`form__row--hidden`);
    }
    if (e === `cycling`) {
      editForm
        .querySelector('.form__input--elevation')
        .closest(`.form__row`)
        .classList.remove(`form__row--hidden`);
      editForm
        .querySelector('.form__input--cadence')
        .closest(`.form__row`)
        .classList.add(`form__row--hidden`);
    }
  }

  // Instruction is displayed when is no workout or hid when is workout

  _checkWorkouts() {
    this.#workouts.length == 0
      ? document.querySelector(`.menu`).classList.add(`hidden`) &
        document.querySelector(`.start`).classList.remove(`hidden`)
      : document.querySelector(`.menu`).classList.remove(`hidden`) &
        document.querySelector(`.start`).classList.add(`hidden`);
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === `running`) {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(`Inputs have to be positive numbers!`);
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === `cycling`) {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(`Inputs have to be positive numbers!`);
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array

    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide start description, form and clear input fields
    this._checkWorkouts();
    this._hideForm();

    // Set local storage to all workout
    this._setLocalStorage();
  }

  _renderWorkoutMarker(
    workout,
    autoPan = true,
    newMarker = true,
    editMarker = false
  ) {
    // Display marker

    const markerIcon = L.icon({
      iconUrl: 'pin.png',
      iconSize: [32, 32],
      iconAnchor: [17, 3],
    });

    const mark = L.marker(workout.coords, { icon: markerIcon }).addTo(
      this.#map
    );
    // console.log(mark);
    const pop = L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      autoPan: autoPan,
      className: `${workout.type}-popup`,
    }).setContent(
      `${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`
    );
    mark.bindPopup(pop).openPopup();
    if (newMarker) this.#workoutMarkers.push(mark);
  }

  _renderWorkout(workout, addNew = true, update = false) {
    let html = `
       <li class="workout workout--${workout.type}" data-id="${workout.id}">
       <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__head hidden">          
            <span class="edit__workout workout__icon"> 
            ✏
            </span>
            <span class="remove__workout workout__icon">
            🗑
            </span>          
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === `running`)
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>

      `;

    if (workout.type === `cycling`)
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          </li>
      `;
    if (addNew) {
      containerWorkouts.insertAdjacentHTML('afterbegin', html);
    }
    if (update) {
      // Remove the old workout and inserting the new one in the same position
      const currentWorkout = document.querySelector(
        `.workout[data-id="${workout.id}"]`
      );

      currentWorkout.style.display = 'none';
      currentWorkout.insertAdjacentHTML('afterend', html);
      currentWorkout.remove();
    }
  }

  _renderEditForm(e) {
    const workoutEl = e.target.closest(`.workout`);

    // Identify workout

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Put in position the edit form and hid workout

    editForm.style.top = `${
      workoutEl.getBoundingClientRect().top -
      containerWorkouts.getBoundingClientRect().top +
      containerWorkouts.scrollTop
    }px`;

    if (workout.type === `running`) {
    }

    editForm.classList.remove(`hidden`);
    workoutEl.classList.add(`edit`);

    // Taking the attributes names from the object

    const attributeKeys = Object.keys(workout);

    attributeKeys.forEach(key => {
      if (key == `type`) {
        this._changeEditFormElevationField(workout[key]);
        editForm.querySelector(`.form__input--${key}`).value = workout[key];
      }
      if (
        key == `distance` ||
        key == `duration` ||
        key == `cadence` ||
        key == `elevationGain`
      ) {
        editForm
          .querySelector(
            `.form__input--${key == `elevationGain` ? `elevation` : key}`
          )
          .setAttribute(`value`, `${workout[key]}`);
      }
    });
    setTimeout(() => editForm.classList.add('animated', 'active'), 0);
  }

  _editWorkout(e) {
    e.preventDefault();

    // Checking the inputs are valid

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    let id;

    function error() {
      if (
        !validInputs(distance, duration, cadence ? cadence : elevationGain) ||
        cadence
          ? !allPositive(distance, duration, cadence)
          : !allPositive(distance, duration)
      )
        return alert(`Inputs have to be positive numbers!`);
    }

    // Finding the workout what we editing

    document.querySelectorAll(`.workout`).forEach(element => {
      if (element.classList.contains(`edit`)) {
        id = element.getAttribute(`data-id`);
      }
      element.classList.remove(`edit`);
    });

    const workoutIndex = this.#workouts.findIndex(workout => workout.id == id);
    const workout = this.#workouts[workoutIndex];

    // Get data from edit form

    const type = inputEditType.value;
    const distance = +inputEditDistance.value;
    const duration = +inputEditDuration.value;

    let cadence;
    let elevationGain;

    // Checking if the original type and the new type are the same and changing the values of the inputs

    // if (workout.type == type) {
    if (type == `running`) {
      cadence = +inputEditCadence.value;
      error();
      this._updateWorkout(workout, distance, duration, cadence, false);
    }
    if (type == `cycling`) {
      elevationGain = +inputEditElevation.value;
      error();
      this._updateWorkout(workout, distance, duration, false, elevationGain);
    }
    // }

    // Keeping the date from previous workout

    const newDate = new Date(Date.parse(workout.date));
    let newWorkout;

    // Checking if the original type and the new type are'nt the same and changing the values of the inputs

    if (workout.type != type) {
      if (workout.type === `running` && type === `cycling`) {
        elevationGain = +inputEditElevation.value;
        error();
        newWorkout = new Cycling(
          workout.coords,
          distance,
          duration,
          elevationGain,
          newDate
        );
      }

      if (workout.type === `cycling` && type === `running`) {
        cadence = +inputEditCadence.value;
        error();
        newWorkout = new Running(
          workout.coords,
          distance,
          duration,
          cadence,
          newDate
        );
      }

      // Keeping the id from previous workout

      // newWorkout.date = workout.date;
      newWorkout.id = workout.id;

      console.log(newDate.getDate());
      console.log(newWorkout);

      // Replacing the old workout with the new workout in #workouts array

      this.#workouts.splice(workoutIndex, 1, newWorkout);

      // Replacing the old workout with the new values

      this._renderWorkout(newWorkout, false, true);

      // Updating the marker (markers array and marker element)

      this._renderWorkoutMarker(newWorkout, true, false, true);

      // Updating Local Storage
      this._setLocalStorage();
    }

    this._hideEditForm();
  }

  _updateWorkout(workout, distance, duration, cadence, elevation) {
    workout.distance = distance;
    workout.duration = duration;
    workout.cadence
      ? (workout.cadence = cadence)
      : (workout.elevationGain = elevation);
    workout.pace
      ? (workout.pace = duration / distance)
      : (workout.speed = distance / (duration / 60));

    // Replacing the old workout with the new values

    this._renderWorkout(workout, false, true);

    // Updating the marker (markers array and marker element)

    this._renderWorkoutMarker(workout, true, false, true);

    // Updating Local Storage
    this._setLocalStorage();
  }

  _removeWorkout(e) {
    // Identification of the workout that has to be deleted
    const el = e.target.closest('.workout');

    // Delete marker from Markers UI and workoutMarkers array
    const workoutCoords = this.#workouts.find(
      workout => workout.id === el.dataset.id
    ).coords;

    const markerIndex = this.#workoutMarkers.findIndex(marker => {
      return (
        marker._latlng.lat === workoutCoords[0] &&
        marker._latlng.lng === workoutCoords[1]
      );
    });
    this.#map.removeLayer(this.#workoutMarkers[markerIndex]); // Delete from marker list
    this.#workoutMarkers.splice(markerIndex, 1); // Delete from workoutMarkers Array

    // Delete workout from workout Arrays
    const index = this.#workouts.findIndex(
      workout => workout.id === el.dataset.id
    );
    this.#workouts.splice(index, 1);

    // Delete workout from list in UI
    el.remove();

    // Checking if the workout array is empty or not, If it is, this function will disable all menu links
    this._checkWorkouts();

    // Updating localStorage or resetting it if there are no more workouts
    if (this.#workouts.length !== 0) {
      this._setLocalStorage(); // Will overwrite the previous 'workout' item
    } else {
      localStorage.removeItem('workouts');

      // Also, if we delete the last workout, the map should be positioned on user's initial coords
      this.#map.setView(this.#coords, this.#mapZoomLevel, {
        animate: true,
        duration: 1.2,
      });
    }
  }

  _deleteAllWorkout() {
    this.#workouts.splice(0);
    // console.log(this.#workouts);

    const deleteFn = function () {
      // Delete all workouts from List
      document
        .querySelectorAll('.workout')
        .forEach(workoutEl => workoutEl.remove());

      // Delete all markers from Map
      this.#workoutMarkers.forEach(marker => {
        this.#map.removeLayer(marker);
      });

      // Delete all markers from workoutMarkers array
      this.#workoutMarkers.splice(0);

      // Positioning the map on the current location
      this.#map.setView(this.#coords, this.#mapZoomLevel, {
        animate: true,
        duration: 1.2,
      });

      // After deleted all workouts the menu links should be disabled
      this._checkWorkouts();
    }.bind(this);

    setTimeout(deleteFn, 600);

    // Reset local Storage
    // localStorage.removeItem('workouts');
  }

  _clicksHandle(e) {
    // Selecting workout and move to popup on the map

    if (e.target.closest(`.workout`)) {
      e.preventDefault();
      this._moveToPopup(e);
    }

    // Hiding option icons in workouts when click event is out of the list

    if (!e.target.closest(`.workout`)) {
      document.querySelectorAll(`.workout__head`).forEach(element => {
        element.classList.add(`hidden`);
      });
    }

    // Hiding form when it's open and if selecting a workout

    if (!form.matches(`.hidden`)) {
      if (
        form !== e.target &&
        !e.target.parentElement.closest(`.form`) &&
        map !== e.target
      ) {
        this._hideForm();
      }
    }

    // Hiding editForm when click event happening outside of the form

    if (!editForm.matches(`.hidden`)) {
      if (
        editForm !== e.target &&
        !e.target.parentElement.closest(`.editForm`) &&
        e.target == map
      ) {
        document.querySelectorAll(`.workout`).forEach(element => {
          element.classList.remove(`edit`);
        });
        this._hideEditForm();
      }
    }

    // Handling menu functions

    // Removing active class from the link if is active
    document
      .querySelectorAll('.menu__link.active')
      .forEach(link => link.classList.remove('active'));

    // Show All workout markers on the map from the menu

    if (e.target.closest(`.menu__option--show`)) {
      // e.preventDefault();
      const group = new L.featureGroup(this.#workoutMarkers);
      this.#map.fitBounds(group.getBounds());
    }

    // Adding active class to the link for highlighting the menu in use

    if (e.target.closest('.menu__link'))
      e.target.closest('.menu__link').classList.add('active');

    // Reveal editing form

    if (e.target.closest(`.edit__workout`)) {
      e.preventDefault;
      document.querySelectorAll(`.workout`).forEach(element => {
        element.classList.remove(`edit`);
      });
      this._renderEditForm(e);
    }

    // Remove individual workout bottom

    if (e.target.closest(`.remove__workout`)) {
      this._removeWorkout(e);
    }

    // Showing the Delete confirmation form

    if (e.target.closest('.menu__option--delete')) {
      e.preventDefault();

      deletingForm.classList.remove('delete-confirmation--hidden');
    }
    // Hiding the form if "Canceling" delete
    if (e.target.closest(`.delete-confirmation__btn--no`)) {
      deletingForm.classList.add('delete-confirmation--hidden');
    }

    // Hiding the form if "Yes" and delete the workouts
    if (e.target.closest(`.delete-confirmation__btn--yes`)) {
      deletingForm.classList.add('delete-confirmation--hidden');
      this._deleteAllWorkout();
    }
  }

  // Selecting workout

  _moveToPopup(e) {
    // Hiding option icons when click event is inside the list

    e.target
      .closest(`.workouts`)
      .querySelectorAll(`.workout__head`)
      .forEach(element => {
        element.classList.add(`hidden`);
      });

    const workoutEl = e.target.closest(`.workout`);

    // Unhide option icons when clicking on a unique workout

    workoutEl.querySelector(`.workout__head`).classList.remove(`hidden`);

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem(`workouts`);
  }
}

const app = new App();

// To Do List:
//
//    - give the sort by option
