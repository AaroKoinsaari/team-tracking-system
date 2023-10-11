"use strict";  // pidä tämä ensimmäisenä rivinä
//@ts-check
// Alustetaan data, joka on jokaisella sivun latauskerralla erilainen.
// tallennetaan data selaimen localStorageen, josta sitä käytetään seuraavilla
// sivun latauskerroilla. Datan voi resetoida lisäämällä sivun osoitteeseen
// ?reset=1
// jolloin uusi data ladataan palvelimelta
// Tätä saa tarvittaessa lisäviritellä
let alustus = async function() {
     // luetaan sivun osoitteesta mahdollinen reset-parametri
     // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
     const params = new window.URLSearchParams(window.location.search);
     let reset = params.get("reset");
     let data;
     if ( !reset  ) {
       try {
          // luetaan vanha data localStoragesta ja muutetaan merkkijonosta tietorakenteeksi
          // https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
          data = JSON.parse(localStorage.getItem("TIEA2120-vt3-2023s"));
       }
       catch(e) {
         console.log("vanhaa dataa ei ole tallennettu tai tallennusrakenne on rikki", data, e);
       }
       if (data) {
               console.log("Käytetään vanhaa dataa");
    	       start( data );
               return;
           }
     }
     // poistetaan sivun osoitteesta ?reset=1, jotta ei koko ajan lataa uutta dataa
     // manipuloidaan samalla selaimen selainhistoriaa
     // https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
     history.pushState({"foo":"bar"}, "VT3", window.location.href.replace("?reset="+reset, ""));
     // ladataan asynkronisesti uusi, jos reset =! null tai tallennettua dataa ei ole
     // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 	 const response = await fetch('https://appro.mit.jyu.fi/cgi-bin/tiea2120/vt3.cgi/');
     data = await response.json();
     console.log("Ladattiin uusi data");
     // tallennetaan data localStorageen. Täytyy muuttaa merkkijonoksi ja JSON-muotoon
	 // https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
	 localStorage.setItem("TIEA2120-vt3-2023s", JSON.stringify(data));
 	 start( data );
};

window.addEventListener("load", alustus);

// oma sovelluskoodi voidaan sijoittaa tähän funktioon
let start = function(data) {
  // tänne oma koodi


  // function sortRadiosAlphabetically() {
  //   // Etsitään kaikki radiobuttonit lomakkeesta
  //   const form = document.querySelector('form');
  //   const allLabels = Array.from(form.querySelectorAll('label'));
    
  //   // Filtteröidään vain radiobuttonien label-elementit
  //   const radioLabels = allLabels.filter(label => label.querySelector('input[type="radio"]'));
  
  //   // Järjestetään radiobuttonit aakkosjärjestykseen labelin mukaan
  //   radioLabels.sort((a, b) => {
  //     const textA = a.textContent.trim();
  //     const textB = b.textContent.trim();
  //     return textA.localeCompare(textB);
  //   });
  
  //   // Poistetaan vanhat radiobuttonit lomakkeesta ja lisätään järjestettynä takaisin
  //   radioLabels.forEach(label => form.removeChild(label));
  //   radioLabels.forEach(label => form.appendChild(label));
  // }
  

  // sortRadiosAlphabetically();


  function jarjestaJaLuoSarjat(lomake, sarjatData) {
    // Järjestetään sarjat aakkosjärjestykseen
    sarjatData.sort((a, b) => a.sarja.localeCompare(b.sarja));
  
    // Etsi div, johon sarja-radiobuttonit lisätään
    const sarjatContainer = document.getElementById('sarjatContainer');
  
    // Luodaan uudet järjestetyt radiobuttonit
    for (const [index, sarja] of sarjatData.entries()) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sarja';
      input.value = sarja.id;
  
      // Ensimmäinen valitaan oletuksena
      if (index === 0) {
        input.checked = true;
      }
  
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + sarja.sarja));
      sarjatContainer.appendChild(label);
    }
  }
  
  const lomake = document.forms[0];
  const sarjat = data.sarjat;
  
  jarjestaJaLuoSarjat(lomake, sarjat);
  


  



  console.log(data);
  // tallenna data sen mahdollisten muutosten jälkeen aina localStorageen seuraavalla tavalla:
  // localStorage.setItem("TIEA2120-vt3-2023", JSON.stringify(data));
  // kts ylempää mallia
  // varmista, että sovellus toimii oikein omien tallennusten jälkeenkin
  // eli näyttää sivun uudelleen lataamisen jälkeen edelliset lisäykset ja muutokset
  // resetoi rakenne tarvittaessa lisäämällä sivun osoitteen perään ?reset=1
  // esim. http://users.jyu.fi/~omatunnus/TIEA2120/vt2/pohja.xhtml?reset=1

};

