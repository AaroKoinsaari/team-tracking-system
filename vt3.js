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

  function jarjestaJaLuoSarjat(sarjatData) {
    sarjatData.sort((a, b) => a.sarja.localeCompare(b.sarja)); // Järjestetään aakkosjärjestykseen
  
    // Luodaan uudet järjestetyt radiobuttonit
    const sarjatContainer = document.getElementById('sarjatContainer');
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


  function validoiKentat(form, fieldName) {
    const fieldElements = form.elements[fieldName];
  
    for (let i = 0; i < fieldElements.length; i++) {
      const value = fieldElements[i].value.trim();
  
      if (value !== '') {
        return true;  // Palautetaan true, jos on edes yksi ei-tyhjä kenttä
      }
    }
  
    return false;
  }  


  function luoJaLisaaJoukkue(data, lomake) {
    const uusiJoukkue = {
      aika: 0,
      jasenet: [],
      joukkue: lomake["nimi"].value,
      leimaustapa: [0],
      matka: 0,
      pisteet: 0,
      rastileimaukset: [],
      sarja: Number(lomake["sarja"].value)  // Tulee merkkijonona, joten muutetaan numeroksi
    };

    // Lisätään vain ei-tyhjät jäsenet taulukkoon
    const jasenKentat = lomake.elements["jasen"];
    for (let i = 0; i < jasenKentat.length; i++) {
      const jasen = jasenKentat[i].value;
      if (jasen !== "") {
        uusiJoukkue.jasenet.push(jasen);
      }
    }

    data.joukkueet.push(uusiJoukkue);  // Lisätään tietorakenteeseen
  }


  function tarkistaJoukkueenNimi(data, fieldName) {
    const nimiValue = fieldName.trim();
    if (nimiValue.length < 2) {
      return false;
    }

    // Tarkistetaan, että nimi on uniikki
    for (let j of data.joukkueet) {
      if (j.joukkue == nimiValue) {
        return false;
      }
    }

    return true;
  }

  
  const lomake = document.forms[0];
  const sarjat = data.sarjat;  
  jarjestaJaLuoSarjat(sarjat);  // Luodaan sarjat listaus

  const submitPainike = lomake.elements["submit"];

  // // Asettaa ensimmäisen radiobuttonin valituksi, kun lomake resetoidaan
  // lomake.addEventListener('reset', function(event) {
  //   const ensimmainenRadio = lomake.elements["sarja"][0];
  //   if (ensimmainenRadio) {
  //     ensimmainenRadio.checked = true;
  //   }
  // });  


  // Tarkistetaan lomake jo click-tapahtumassa, jotta submit-tapahtumankäsittelijälle
  // Lähetetään suoraan validi lomake
  submitPainike.addEventListener('click',  function(event) {
    console.log("Click-tapahtumankäsittelijä aktivoitu"); 

    // Tarkistetaan joukkueen nimi
    const nimiKentta = lomake.elements["nimi"];
    const joukkueenNimiValidi = tarkistaJoukkueenNimi(data, nimiKentta.value);
    if (!joukkueenNimiValidi) {
      nimiKentta.setCustomValidity("Joukkueen nimen on uniikki ja vähintään kaksi merkkiä pitkä");
      nimiKentta.reportValidity();
      event.preventDefault();  // Estetään lähetys epäonnistuessa
      return;
    }
    nimiKentta.setCustomValidity("");  // Tyhjennetään virheilmoitukset

    // Tarkistetaan jäsenkentät
    const jasenKentta = lomake.elements["jasen"];
    const jasenetValidit = validoiKentat(lomake, "jasen");
    if (!jasenetValidit) {
      for (let kentta of jasenKentta) {
        kentta.setCustomValidity("Joukkueella on oltava vähintään yksi jäsen");
      }
      jasenKentta[0].reportValidity();  // Toinen kentistä riittää virheilmoitukseen
      event.preventDefault();  // Estetään lähetys epäonnistuessa
      return;
    }
    for (let kentta of jasenKentta) {
      kentta.setCustomValidity("");  // Tyhjennetään virheilmoitukset
    }
  });


  // Tapahtumankäsittelijä joukkueen lisäämispainikkeelle
  lomake.addEventListener("submit", function(event) {
    console.log("Submit-tapahtumankäsittelijä aktivoitu"); 
    event.preventDefault();  // Estetään lomakkeen automaattinen lähetys

    // Täydennetään joukkueobjekti ja lisätään se tietorakenteeseen.
    luoJaLisaaJoukkue(data, lomake);
    lomake.reset();

    localStorage.setItem("TIEA2120-vt3-2023s", JSON.stringify(data));  // Tallenetaan päivitetty data
  });




  console.log(data);
  // tallenna data sen mahdollisten muutosten jälkeen aina localStorageen seuraavalla tavalla:
  // localStorage.setItem("TIEA2120-vt3-2023s", JSON.stringify(data));
  // kts ylempää mallia
  // varmista, että sovellus toimii oikein omien tallennusten jälkeenkin
  // eli näyttää sivun uudelleen lataamisen jälkeen edelliset lisäykset ja muutokset
  // resetoi rakenne tarvittaessa lisäämällä sivun osoitteen perään ?reset=1
  // esim. http://users.jyu.fi/~omatunnus/TIEA2120/vt2/pohja.xhtml?reset=1

};

