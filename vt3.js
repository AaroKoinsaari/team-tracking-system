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

  function jarjestaJaLuoSarjat(sarjatData) {
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

    const jasenKentat = lomake.elements["jasen"];

    // Lisätään vain ei-tyhjät jäsenet taulukkoon
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
  // const submitButton = lomake.elements["submit"];  // Uuden joukkueen lisäyspainike
  
  jarjestaJaLuoSarjat(sarjat);  // Luodaan sarjat listaus

  // Tapahtumankäsittelijä joukkueen lisäämispainikkeelle
  lomake.addEventListener("submit", function(event) {
    event.preventDefault();  // Estetään lomakkeen automaattinen lähetys

    // Tarkistetaan, että kentät eivät ole tyhjiä tai whitespacea
    const jasenKentatValideja = validoiKentat(lomake, "jasen");

    // Tarkistetaan joukkueen nimi
    const nimiKentta = lomake.elements["nimi"];
    const joukkueenNimiValidi = tarkistaJoukkueenNimi(data, nimiKentta.value);
    if (!joukkueenNimiValidi) {
      nimiKentta.setCustomValidity("Nimen on oltava uniikki ja vähintään kaksi merkkiä");
      nimiKentta.reportValidity();
      return;
    }
    nimiKentta.setCustomValidity("");  // Tyhjennetään aiemmat virheilmoitukset

    // Tarkistetaan, että ainakin yksi jäsenkenttä on täytetty
    let edesYksiKentta = false;
    const jasenKentat = lomake.elements["jasen"];
    for (let i = 0; i < jasenKentat.length; i++) {
      if (jasenKentat[i].value.trim() !== '') {
        edesYksiKentta = true;
        break;
      }
    }

    if (!edesYksiKentta || !jasenKentatValideja) {
      jasenKentat[0].setCustomValidity("Joukkueella on oltava vähintään yksi jäsen");
      jasenKentat[0].reportValidity();
    }

    // Täydennetään joukkueobjekti ja lisätään se tietorakenteeseen.
    luoJaLisaaJoukkue(data, lomake);
    lomake.reset();

    // Asetetaan ensimmäinen radiobuttoni valituksi
    // TODO: Korjaa document.forms käyttäen
    // const radioButtons = lomake.querySelectorAll('input[type="radio"]');
    // if (radioButtons.length > 0) {
    //   radioButtons[0].checked = true;
    // }

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

