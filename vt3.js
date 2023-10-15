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

  /**
   * Järjestää sarjat aakkosjärjestykseen ja luo HTML-radiobuttonit niille.
   * Ensimmäinen radiobutton valitaan oletuksena.
   *
   * @param {Array<Object>} sarjatData - Taulukko sarjoista, joka sisältää sarjojen nimet ja ID:t.
   */
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

      label.appendChild(document.createTextNode(' ' + sarja.sarja));
      label.appendChild(input);
  
      // Ensimmäinen valitaan oletuksena
      if (index === 0) {
        input.setAttribute("checked", "checked");
      }
  
      sarjatContainer.appendChild(label);
    }
  }


  /**
   * Järjestää ja luo leimaustavat sivun lomakkeelle.
   *
   * @param {Array} leimaustavatData - Leimaustavat taulukossa.
   */
  function jarjestaJaLuoLeimaustavat(leimaustavatData) {
    leimaustavatData.sort((a, b) => a.localeCompare(b));  // Järjestetään aakkosjärjestykseen

    const leimaustavatContainer = document.getElementById('leimaustavatContainer');

    for (const [index, leimaustapa] of leimaustavatData.entries()) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'leimaustapa';
      input.value = index;

      label.appendChild(document.createTextNode(' ' + leimaustapa));
      label.appendChild(input);

      leimaustavatContainer.appendChild(label);
    }
  }


  /**
   * Päivittää joukkueiden listan sivulla korvaamalla mahdollisen vanhan listauksen uudella
   *
   * @param {Object} data - Tietorakenne, jossa joukkueet ovat.
   */
  function paivitaJoukkueLista(data) {
    const joukkueet = jarjestaJoukkueet(data.joukkueet);

    // Poistetaan mahdollinen vanha listaus
    const vanhaUl = document.getElementById("joukkueLista");
    if (vanhaUl) {
      vanhaUl.remove();
    }

    // Luodaan uusi ul-elementti
    const ul = document.createElement('ul');
    ul.id = 'joukkueLista';

    // Käydään läpi järjestetty lista joukkueista
    for (const joukkue of joukkueet) {
      jarjestaJasenet(joukkue);
      const li = document.createElement('li');
      li.textContent = joukkue.joukkue + " ";

      // Lisätään joukkueelle sarja
      const strong = document.createElement('strong');
      const sarja = data.sarjat.find(s => s.id === joukkue.sarja);
      strong.textContent = sarja.sarja;
      li.appendChild(strong);

      // Lisätään leimaustavat
      const leimaustavat = joukkue.leimaustapa.map(index => data.leimaustavat[index]).join(', ');
      const leimaustavatSpan = document.createElement('span');
      leimaustavatSpan.textContent = ` (${leimaustavat})`;
      li.appendChild(leimaustavatSpan);

      // Luodaan sisäkkäinen ul-elementti jokaiselle joukkueen jäsenelle
      const sisempiUl = document.createElement('ul');
      for (const jasen of joukkue.jasenet) {
        const sisempiLi = document.createElement('li');
        sisempiLi.textContent = jasen;
        sisempiUl.appendChild(sisempiLi);
      }

      li.appendChild(sisempiUl);
      ul.appendChild(li);
    }

    document.body.appendChild(ul);
  }


  /**
   * Järjestää joukkueet aakkosjärjestykseen nimen perusteella
   * 
   * @param {Object} joukkueet 
   * @returns Lista joukkueista aakkosjärjestyksessä
   */
  function jarjestaJoukkueet(joukkueet) {
    return joukkueet.sort((a, b) => a.joukkue.localeCompare(b.joukkue));
  }


  /**
   * Järjestää joukkueiden jäsenet aakkosjärjestykseen
   * 
   * @param {Object} joukkue Joukkueobjekti
   */
  function jarjestaJasenet(joukkue) {
    joukkue.jasenet.sort((a, b) => a.localeCompare(b));
  }


  /**
   * Tarkistaa, että annetussa lomake-elementissä on edes yksi ei-tyhjä kenttä.
   *
   * @param {HTMLFormElement} form - Lomake-elementti, jossa kentät sijaitsevat.
   * @param {string} fieldName - Kentän nimi, jota halutaan tarkistaa.
   * @returns {boolean} true jos vähintään yksi kenttä ei ole tyhjä, muutoin false.
   */
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


  /**
   * Luo uuden joukkue-objektin ja lisää sen annettuun tietorakenteeseen.
   *
   * @param {Object} data - Tietorakenne, johon uusi joukkue lisätään.
   * @param {HTMLFormElement} lomake - Lomake-elementti, josta uuden joukkueen tiedot otetaan.
   */
  function luoJaLisaaJoukkue(data, lomake) {
    const uusiJoukkue = {
      aika: 0,
      jasenet: [],
      joukkue: lomake["nimi"].value,
      leimaustapa: [],
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

    // Otetaan talteen leimaustavat
    const leimausKentat = lomake.elements["leimaustapa"];
    for (let i = 0; i < leimausKentat.length; i++) {
      if (leimausKentat[i].checked) {
        uusiJoukkue.leimaustapa.push(Number(leimausKentat[i].value));
      }
    }

    data.joukkueet.push(uusiJoukkue);  // Lisätään tietorakenteeseen
  }


  /**
   * Tarkistaa onko annettu joukkueen nimi uniikki ja vähintään 2 merkkiä pitkä.
   *
   * @param {Object} data - Tietorakenne, joka sisältää kaikki joukkueet.
   * @param {string} fieldName - Tarkistettavan joukkueen nimi.
   * @returns {boolean} - true, jos nimi on kelvollinen ja uniikki. Muutoin false.
   */
  function tarkistaJoukkueenNimi(data, fieldName) {
    const nimiValue = fieldName.trim().toLowerCase();
    if (nimiValue.length < 2) {
      return false;
    }

    // Tarkistetaan, että nimi on uniikki
    for (let j of data.joukkueet) {
      if (j.joukkue.trim().toLowerCase() == nimiValue) {
        return false;
      }
    }

    return true;
  }


  // function tarkistaJasentenNimet(lomake, fiedNimi) {
  //   const kentat = Array.from(lomake.elemets[fieldNimi]);
  //   const kenttaArvot = kentat.map(kentta => kentta.value.trim());
  //   const uniikitArvot = [...new Set(kenttaArvot)];
  //   const taytettyjaKenttia = uniikitArvot.filter(arvo => arvo !== "").length;

  //   if (taytettyjaKenttia < 2) {
  //     return false;
  //   }

  //   return true;
  // }


  function tarkistaTyhjatKentat(lomake, jasenetContainer) {
    const jasenKentat = lomake.elements['jasen'];
    let tyhjat = 0;
    for (let i = 0; i < jasenKentat.length; i++) {
      if (jasenKentat[i].value === '') {
        tyhjat++;
      }
    }
    if (tyhjat === 0) {
      paivitaJasentenNumerointi(lomake);
    }
    return tyhjat;
  }
  


  function paivitaJasentenNumerointi(lomake) {
    const jasenKentat = lomake.elements['jasen'];
    
    for (let i = 0; i < jasenKentat.length; i++) {
      const kentta = jasenKentat[i];
      const container = kentta.parentNode;
      const label = container.querySelector('span');
      label.textContent = "Jäsen " + (i + 1);
    }
  }


  function lisaaJasenKentta(lomake, jasenetContainer) {

    // Luodaan div container
    const uusiKentta = document.createElement("div");
    uusiKentta.className = "label-container";

    // Lisätään uusi span-elementti labeliksi
    const uusiLabel = document.createElement("span");
    uusiLabel.textContent = "Jäsen";  // Numerointi päivitetään myöhemmin

    // Luodaan uusi input-elementti
    const uusiInput = document.createElement("input");
    uusiInput.type = "text";
    uusiInput.name = "jasen";
    uusiInput.className = "jasen-kentta";
    uusiInput.value = "";

    // Lisätään span ja input containeriin
    uusiKentta.appendChild(uusiLabel);
    uusiKentta.appendChild(uusiInput);

    // Lisätään uusi kenttä lomakkeeseen
    jasenetContainer.appendChild(uusiKentta);

    paivitaJasentenNumerointi(lomake);
  }


  function poistaJasenKentta(lomake, jasenetContainer) {
    const jasenKentat = lomake.elements['jasen'];
    for (let i = 0; i < jasenKentat.length; i++) {
      if (jasenKentat[i].value === '') {
        const parentContainer = jasenKentat[i].parentNode;
        jasenetContainer.removeChild(parentContainer);
        break;  // Poistetaan vain yksi tyhjä kenttä
      }
    }
    paivitaJasentenNumerointi(lomake);
  }
  
  

  
  const lomake = document.forms[0];
  const sarjat = data.sarjat;
  const leimaustavat = data.leimaustavat;
  const submitPainike = lomake.elements["submit"];

  const jasenetContainer = document.getElementById('jasenetContainer');

  jarjestaJaLuoSarjat(sarjat);
  jarjestaJaLuoLeimaustavat(leimaustavat);
  paivitaJoukkueLista(data);


  jasenetContainer.addEventListener('input', function(event) {
    const target = event.target;
    if (target.classList.contains('jasen-kentta')) {
      const tyhjatKentat = tarkistaTyhjatKentat(lomake);
      if (tyhjatKentat === 0) {
        lisaaJasenKentta(lomake, jasenetContainer);
      } else if (tyhjatKentat > 1) {
        poistaJasenKentta(lomake, jasenetContainer);
      }
    }
  });





  
  /**
   * Käsittelee click-tapahtuman.
   * Tarkistaa joukkueen nimen ja jäsenten kentät. Jos tarkistukset epäonnistuvat,
   * funktio estää lomakkeen lähettämisen ja asettaa virheilmoituksen.
   *
   * @param {Event} event - click-tapahtuman tiedot.
   */
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
    nimiKentta.setCustomValidity("");  // Tyhjennetään virheilmoitus


    // Tarkistetaan, että edes yksi leimaustapa on valittu
    const leimausKentat = lomake.elements["leimaustapa"];
    let leimaustapaValittu = false;

    for (let i = 0; i < leimausKentat.length; i++) {
      if (leimausKentat[i].checked) {
        leimaustapaValittu = true;
        break;
      }
    }

    if (!leimaustapaValittu) {
      leimausKentat[0].setCustomValidity("Vähintään yksi leimaustapa on valittava");
      leimausKentat[0].reportValidity();
      event.preventDefault();  // Estetään lähetys epäonnistuessa
      return;
    }
    leimausKentat[0].setCustomValidity("");  // Tyhjennetään virheilmoitus


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


  /**
   * Tapahtumankäsittelijä lomakkeen submit-tapahtumalle.
   * Estää lomakkeen automaattisen lähettämisen, täydentää joukkueobjektin,
   * lisää sen tietorakenteeseen, ja tallentaa päivitetyn datan LocalStorageen.
   *
   * @param {Event} event - submit-tapahtuman tiedot.
   */
  lomake.addEventListener("submit", function(event) {
    console.log("Submit-tapahtumankäsittelijä aktivoitu"); 
    event.preventDefault();  // Estetään lomakkeen automaattinen lähetys

    luoJaLisaaJoukkue(data, lomake);  // Täydentää joukkueobjektin
    lomake.reset();

    localStorage.setItem("TIEA2120-vt3-2023s", JSON.stringify(data));  // Tallenetaan päivitetty data

    paivitaJoukkueLista(data);
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
