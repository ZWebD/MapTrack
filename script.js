'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date=...
    // this.id=...
    this.coords = coords; //[lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDay()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
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
const workoutHead = document.querySelector(`.workout__head`);
const map = document.querySelector(`#map`);

// const editWorkout = document.querySelector(`.edit__workout`);

class App {
  #map;
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
    // Click event
    document.body.addEventListener(`click`, this._clicksHandle.bind(this));

    // containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));
    // containerWorkouts.addEventListener(`click`, this._clicksHandle.bind(this));
    // document.addEventListener(`click`, this._clicksHandle.bind(this));
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

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

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

  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
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

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workout
    this._setLocalStorage();
  }

  _editWorkout(e) {
    const workoutEl = e.target.closest(`.workout`);

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this._renderEditForm(workout);
    // console.log(workout);
  }

  // ???????????????????????????????????????????????????????????????????????????????????????????????
  //  Submit event ?????????????
  // ???????????????????????????????????????????????????????????????????????????????????????????????

  _renderEditForm(workout) {
    console.log(workout);
    console.log(workout.type);
    let html = `<ul class="workouts">
    <form class="editForm">
      <div class="form__row">
        <label class="form__label">Type</label>
        <select class="form__input form__input--type">
        ${
          workout.type == 'running'
            ? `<option value="running">Running</option>
          <option value="cycling">Cycling</option>`
            : `<option value="cycling">Cycling</option><option value="running">Running</option>`
        }
        </select>
      </div>
      <div class="form__row">
        <label class="form__label">Distance</label>
        <input class="form__input form__input--distance" placeholder="${
          workout.distance
        } km" />
      </div>
      <div class="form__row">
        <label class="form__label">Duration</label>
        <input
          class="form__input form__input--duration"
          placeholder="${workout.duration} min"
        />
      </div>
      <div class="form__row ${
        workout.type == 'running' ? '' : `form__row--hidden`
      }">
        <label class="form__label">Cadence</label>
        <input
          class="form__input form__input--cadence"
          placeholder="${workout.cadence} step/min"
        />
      </div>
      <div class="form__row ${
        workout.type == 'running' ? `form__row--hidden` : ''
      }">
        <label class="form__label">Elev Gain</label>
        <input
          class="form__input form__input--elevation"
          placeholder="${workout.elevationGain} meters"
        />
      </div>
      <button type="submit" class="form__btn">OK</button>
    </form>
  </ul>`;
    document.querySelector(`.menu`).insertAdjacentHTML(`afterend`, html);
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

    // if (editMarker) {
    //   const markerIndex = this.#workoutMarkers.findIndex(mark => {
    //     return (
    //       mark._latlng.lat === workout.coords[0] &&
    //       mark._latlng.lng === workout.coords[1]
    //     );
    //   });

    //   // Deleting the old marker from UI (from the map)
    //   this.#map.removeLayer(this.#workoutMarkers[markerIndex]);

    //   // Replacing the old marker with the new one in the #workoutMarkers array
    //   this.#workoutMarkers.splice(markerIndex, 1, mark);
    //   // console.log(this.#workoutMarkers);
    // }
  }

  _renderWorkout(workout) {
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

    form.insertAdjacentHTML(`afterend`, html);

    // ???????????????????????????????????????????????????????????????????????????????????????????????
    //  Make editable and deletable the workout and why I cant see the Edit/remove button?????????????
    // ???????????????????????????????????????????????????????????????????????????????????????????????

    // if (adding) {
    //   containerWorkouts.insertAdjacentHTML('afterbegin', html);
    //   // console.log(this.#workouts);
    // }

    // if (editing) {
    //   // Deleting the old workout and inserting the new one in the same position
    //   const currentWorkout = document.querySelector(
    //     `.workout[data-id="${workout.id}"]`
    //   );

    //   currentWorkout.style.display = 'none';
    //   currentWorkout.insertAdjacentHTML('afterend', html);
    //   currentWorkout.remove();
    // }
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

    // Show All workout markers on the map

    if (e.target.closest(`.menu__option--show`)) {
      // e.preventDefault();
      const group = new L.featureGroup(this.#workoutMarkers);
      this.#map.fitBounds(group.getBounds());
    }

    if (e.target.closest(`.edit__workout`)) {
      e.preventDefault;
      this._editWorkout(e);
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

  // _removeWorkout(e) {
  //   // Identification of the workout that has to be removed
  //   const el = e.target.closest('.workout');

  //   // Remove marker from Markers UI and workoutMarkers array
  //   const workoutCoords = this.#workouts.find(
  //     workout => workout.id === el.dataset.id
  //   ).coords;

  //   const markerIndex = this.#workoutMarkers.findIndex(marker => {
  //     return (
  //       marker._latlng.lat === workoutCoords[0] &&
  //       marker._latlng.lng === workoutCoords[1]
  //     );
  //   });

  //   this.#map.removeLayer(this.#workoutMarkers[markerIndex]); // Remove from UI
  //   this.#workoutMarkers.splice(markerIndex, 1); // Remove from workout Markers Array

  //   // Remove workout from workout Arrays
  //   const index = this.#workouts.findIndex(
  //     workout => workout.id === el.dataset.id
  //   );
  //   this.#workouts.splice(index, 1);

  //   // Remove workout from list in UI
  //   el.remove();

  //   // Checking if the workout array is empty or not, If it is, this function will disable all menu links
  //   this._checkWorkouts();

  //   // Updating localStorage or resetting it if there are no more workouts
  //   if (this.#workouts.length !== 0) {
  //     this._setLocalStorage(); // Will overwrite the previous 'workout' item
  //   } else {
  //     localStorage.removeItem('workouts');

  //     // Also, if we remove the last workout, the map should be positioned on user's initial coords
  //     this.#map.setView(this.#userCoords, this.#mapZoomLevel, {
  //       animate: true,
  //       duration: 1.2,
  //     });
  //   }
  // }

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

    // console.log(this.#workouts[0].id);
    // console.log(JSON.parse(localStorage.getItem(localStorage.key(`workouts`))));
  }

  reset() {
    localStorage.removeItem(`workouts`);
  }
}

const app = new App();

// To Do List:
//
//    - give the function of removing workouts
//    - give the sort by option
//    - give the editing function
//
//
//
//
//
//
//
//
