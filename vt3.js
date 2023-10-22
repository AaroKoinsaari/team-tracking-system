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
  * Täyttää annetun HTML-lomake-elementin joukkueen tiedoilla.
  *
  * @param {HTMLFormElement} lomake - Lomake-elementti, josta tiedot kerätään.
  * @param {Object} joukkue - Joukkueobjekti, joka sisältää tiedot.
  */
  function taytaLomake(lomake, joukkue) {
    valittuJoukkue = joukkue;  // Päivitetään nykyinen joukkue
    lomake.reset();  // Tyhjennetään aluksi entiset lomaketiedot
    let jasenKentat = lomake.elements['jasen'];

    // Säädetään lomakekenttien määrä oikeaksi
    const kohdeKenttienMaara = joukkue.jasenet.length + 1;  // +1 yhdelle tyhjälle kentälle
    while (jasenKentat.length !== kohdeKenttienMaara) {
      if (jasenKentat.length < kohdeKenttienMaara) {
        lisaaJasenKentta(lomake, jasenetContainer);
      } else if (jasenKentat.length > 2) {  // Varmistetaan, että aina väh. 2 tyhjää kenttää
        poistaJasenKentta(lomake, jasenetContainer);
      }
      jasenKentat = lomake.elements['jasen'];
    }

    // Täytetään perustiedot
    lomake['nimi'].value = joukkue.joukkue;
    lomake['sarja'].value = joukkue.sarja;

    // Täytetään jäsenekentät
    for (let i = 0; i < jasenKentat.length && i < joukkue.jasenet.length; i++) {
      jasenKentat[i].value = joukkue.jasenet[i];
    }

    // Täytetään leimaustavat
    const leimaustapaKentat = lomake.elements['leimaustapa'];
    for (const leimaus of leimaustapaKentat) {
      if (joukkue.leimaustapa.includes(Number(leimaus.value))) {
        leimaus.checked = true;
      }
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
      // li.textContent = joukkue.joukkue + " ";

      // Luodaan linkki joukkueelle
      const joukkueLink = document.createElement('a');
      joukkueLink.textContent = joukkue.joukkue;
      joukkueLink.href = "#" + joukkue.joukkue;

      // Lisätään tapahtumankuuntelija linkin klikkaukselle
      joukkueLink.addEventListener('click', function(event) {
        event.preventDefault();
        lomake.scrollIntoView();  // Vieritetään sivua lomakkeen kohdalle
        taytaLomake(lomake, joukkue);
      });

      li.appendChild(joukkueLink);
      li.append(" ");  // Välilyönti nimen ja sarjan väliin

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
   * jättäen huomiotta mahdolliset whitespacet nimen alusta ja lopusta.
   * 
   * @param {Object} joukkueet 
   * @returns {Array} Aakkosjärjestykseen järjestetty joukkueiden taulukko.
   */
  function jarjestaJoukkueet(joukkueet) {
    return joukkueet.sort((a, b) => a.joukkue.trim().localeCompare(b.joukkue.trim()));
  }


  /**
   * Järjestää joukkueiden jäsenet aakkosjärjestykseen
   * jättäen huomiotta mahdolliset whitespacet nimen alusta ja lopusta.
   * 
   * @param {Object} joukkue Joukkueobjekti
   */
  function jarjestaJasenet(joukkue) {
    joukkue.jasenet.sort((a, b) => a.trim().localeCompare(b.trim()));
  }


  /**
   * Luo uuden joukkueen tai muokkaa olemassa olevaa joukkuetta.
   * @param {Object} data - Tietorakenne, jossa joukkueet sijaitsevat.
   * @param {HTMLFormElement} lomake - Lomake-elementti, josta tiedot kerätään.
   */
  function luoJaLisaaJoukkue(data, lomake) {
    let kohdeJoukkue;

    /**
     * Lisää jäsenet kohdejoukkueeseen.
     * @param {HTMLFormElement} lomake - Lomake-elementti, josta tiedot kerätään.
     */
    function lisaaJasenet(lomake) {
      const jasenKentat = lomake.elements["jasen"];
      for (let i = 0; i < jasenKentat.length; i++) {
        const jasen = jasenKentat[i].value;
        if (jasen !== "") {
          kohdeJoukkue.jasenet.push(jasen);
        }
      }
    }

    /**
     * Lisää leimaustavat kohdejoukkueeseen.
     * @param {HTMLFormElement} lomake - Lomake-elementti, josta tiedot kerätään.
     */
    function lisaaLeimaustavat(lomake) {
      const leimausKentat = lomake.elements["leimaustapa"];
      for (let i = 0; i < leimausKentat.length; i++) {
        if (leimausKentat[i].checked) {
          kohdeJoukkue.leimaustapa.push(Number(leimausKentat[i].value));
        }
      }
    }

    if (valittuJoukkue !== null) {  // Muokattava joukkue
      kohdeJoukkue = valittuJoukkue;
      kohdeJoukkue.jasenet = [];
      kohdeJoukkue.leimaustapa = [];
      kohdeJoukkue.joukkue = lomake.elements['nimi'].value;
    } else {  // Uusi joukkue
      kohdeJoukkue = {
        aika: 0,
        jasenet: [],
        joukkue: lomake["nimi"].value,
        leimaustapa: [],
        matka: 0,
        pisteet: 0,
        rastileimaukset: [],
        sarja: Number(lomake["sarja"].value)
      };
      data.joukkueet.push(kohdeJoukkue);
    }

    // Lisätään jäsenet ja leimaustavat kohdejoukkueeseen
    lisaaJasenet(lomake);
    lisaaLeimaustavat(lomake);
  } 


  /**
   * Tarkistaa annetut kentät ja laskee, kuinka monta niistä on tyhjiä.
   * Tyhjyys määritellään siten, että kentän arvo on joko tyhjä merkkijono tai sisältää vain välilyöntejä.
   *
   * @param {HTMLCollection} kentat -  HTML tekstikentät.
   * @returns {number} tyhjia - Tyhjien kenttien lukumäärä.
   */
  function tarkistaTyhjatKentat(kentat) {
    let tyhjia = 0;
    for (let i = 0; i < kentat.length; i++) {
      const value = kentat[i].value.trim();
      if (value === '') {
        tyhjia++;
      }
    }
    return tyhjia;
  }
  

  /**
   * Päivittää jäsenkenttien numeroinnin HTML-lomakkeessa.
   * 
   * @param {HTMLFormElement} lomake - Lomake-elementti, jossa jäsenkentät ovat.
   */
  function paivitaJasentenNumerointi(lomake) {
    const jasenKentat = lomake.jasen;
    
    for (let i = 0; i < jasenKentat.length; i++) {
      const kentta = jasenKentat[i];
      const container = kentta.parentNode;
      const label = container.querySelector('label');
      
      label.textContent = "Jäsen " + (i + 1);
      
    }
  }


  /**
   * Lisää tai poistaa "poista"-ruksin jäsenkenttien viereen lomakkeella.
   * Jos lomakkeella on täytettyjä kenttiä enemmän kuin kaksi, ruksit lisätään. 
   * Jos kenttiä on jäljellä vain kaksi tai vähemmän, ruksit poistetaan.
   * Ruksin klikkaaminen poistaa sen vieressä olevan kentän lomakkeelta ja päivittää ruksien määrän.
   *
   * @param {HTMLCollection} jasenKentat - Lomakkeen input-jäsenkentät.
   */
  function lisaaRuksit(jasenKentat) {
    let taytettyja = 0;

    // Lasketaan täytettyjen kenttien määrä
    for (let i = 0; i < jasenKentat.length; i++) {
        if (jasenKentat[i].value.trim() !== '') {
            taytettyja++;
        }
    }

    // Käydään läpi kaikki kentät uudelleen
    for (let i = 0; i < jasenKentat.length; i++) {
      const kentta = jasenKentat[i];
      const container = kentta.parentNode;

      // Poista vanha ruksi, jos sellainen on
      const vanhaRuksi = container.querySelector('.remove-btn');
      if (vanhaRuksi) {
          container.removeChild(vanhaRuksi);
      }

      // Lisää uusi ruksi, jos ehdot täyttyvät
      if (taytettyja > 2 && kentta.value.trim() !== '') {
          const uusiRuksi = document.createElement('span');
          uusiRuksi.className = 'remove-btn';
          uusiRuksi.textContent = 'x';
          container.appendChild(uusiRuksi);

        // click-tapahtumankuuntelija ruksin painallukselle
        uusiRuksi.addEventListener('click', function() {
            poistaJasenKentta(lomake, jasenetContainer, kentta);
            lisaaRuksit(jasenKentat);
        });
      }
    }
  }


  /**
   * Lisää uuden jäsenkentän lomakkeeseen.
   *
   * @param {HTMLFormElement} lomake - Lomake-elementti, johon uusi jäsenkenttä lisätään.
   * @param {HTMLElement} jasenetContainer - div-elementti, joka sisältää kaikki jäsenkentät.
   */
  function lisaaJasenKentta(lomake, jasenetContainer) {

    // Luodaan div container
    const uusiKentta = document.createElement("div");
    uusiKentta.className = "label-container";

    // Lisätään uusi span-elementti labeliksi
    const uusiLabel = document.createElement("label");
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


  /**
   * Poistaa joko annetun jäsenkentän tai ensimmäisen tyhjän jäsenkentän lomakkeesta.
   * 
   * Jos `poistettavaKentta`-parametri annetaan, poistetaan kyseinen kenttä. 
   * Jos sitä ei anneta, poistetaan ensimmäinen tyhjä jäsenkenttä.
   *
   * @param {HTMLFormElement} lomake - Lomake-elementti, josta jäsenkenttä poistetaan.
   * @param {HTMLElement} jasenetContainer - div-elementti, joka sisältää kaikki jäsenkentät.
   * @param {HTMLInputElement|null} [poistettavaKentta=null] - Valinnainen jäsenkenttä, joka halutaan poistaa.
   *                                                           Jos ei annettu, poistetaan ensimmäinen tyhjä kenttä.
   */
  function poistaJasenKentta(lomake, jasenetContainer, poistettavaKentta = null) {
    const jasenKentat = lomake.elements['jasen'];
  
    if (poistettavaKentta) {
      jasenetContainer.removeChild(poistettavaKentta.parentNode);
    } else {
      for (let i = 0; i < jasenKentat.length; i++) {
        if (jasenKentat[i].value === '') {
          const parentContainer = jasenKentat[i].parentNode;
          jasenetContainer.removeChild(parentContainer);
          break;  // Poistetaan vain yksi tyhjä kenttä
        }
      }
    }
  
    paivitaJasentenNumerointi(lomake);
  }

  
  /**
   * Poistaa kaikki määritellyt alielementit annetusta containerista.
   *
   * @param {HTMLElement} container - Ylemmän tason elementti, josta alielementit poistetaan.
   * @param {string} selector - CSS-selektori, joka määrittelee poistettavat alielementit.
   */
  function poistaElementit(container, selector) {
    const poistettavatElementit = container.querySelectorAll(selector);
    poistettavatElementit.forEach(function(element) {
      element.parentNode.removeChild(element);      
    });
  }


  /**
   * Tarkistaa, ovatko taulukon nimet uniikkeja (case-insensitive ja whitespace trimmattu).
   *
   * @param {string[]} nimet - Taulukko nimistä, jotka halutaan tarkistaa.
   * @returns {boolean} - true, jos kaikki nimet ovat uniikkeja; muuten false.
   */
  function ovatkoNimetUniikkeja(nimet) {
    const nimetSet = new Set();  // Luodaan Set uniikkien nimien tallennukseen
  
    for (let nimi of nimet) {
      const vertailtavaNimi = nimi.trim().toLowerCase();
      if (vertailtavaNimi === '') {
        continue;
      }
      if (nimetSet.has(vertailtavaNimi)) {
        return false;  // Samanlainen nimi löytyi
      }
      nimetSet.add(vertailtavaNimi);
    }
  
    return true;  // Kaikki nimet ovat uniikkeja
  } 


  /**
   * Tarkistaa, että joukkueen nimi on uniikki ja vähintään kaksi merkkiä pitkä.
   * Asettaa tarvittavat virheilmoitukset.
   * 
   * @param {HTMLFormElement} lomake - Lomake-elementti, jossa nimi-kenttä sijaitsee.
   * @param {Object} data - Data, josta tarkistetaan muiden joukkueiden nimet.
   * @returns {boolean} true, jos nimi on kelvollinen; false, jos ei.
   */
  function tarkistaJoukkueenNimi(lomake, data, muokattavaJoukkue) {
    const nimiKentta = lomake.elements["nimi"];
    const nimiValue = nimiKentta.value.trim().toLowerCase();
    
    // Tarkistetaan nimen pituus
    if (nimiValue.length < 2) {
      nimiKentta.setCustomValidity("Joukkueen nimen on oltava vähintään kaksi merkkiä pitkä");
      nimiKentta.reportValidity();
      return false;
    }

    // Tarkistetaan, että nimi on uniikki koko datassa
    for (const joukkue of data.joukkueet) {
      if (joukkue.joukkue.toLowerCase() === nimiValue) {
        // Jos kyseessä on muokattava joukkue, nimen samankaltaisuus on sallittu
        if (muokattavaJoukkue && joukkue.joukkue === muokattavaJoukkue.joukkue) {
          console.log("Muokattava joukkue tunnistettu");
          continue;
        }
        nimiKentta.setCustomValidity("Joukkueen nimen on oltava uniikki");
        nimiKentta.reportValidity();
        return false;
      }
    }
    // Tyhjennetään mahdollinen aikaisempi virheilmoitus
    nimiKentta.setCustomValidity("");
    return true;
  }


  /**
   * Tarkistaa, että vähintään yksi leimaustapa on valittu lomakkeessa.
   * 
   * Jos yhtään leimaustapaa ei ole valittu, asettaa virheilmoituksen ensimmäiseen leimaustapa-kenttään.
   * Jos vähintään yksi leimaustapa on valittu, nollaa mahdollisen aikaisemman virheilmoituksen.
   *
   * @param {HTMLFormElement} lomake - Lomake-elementti, jossa leimaustavat sijaitsevat.
   * @returns {boolean} - true, jos vähintään yksi leimaustapa on valittu, muuten false.
   */
  function tarkistaLeimaustapa(lomake) {
    const leimausKentat = lomake.elements["leimaustapa"];
    const ekaKentta = leimausKentat[0];

    for (let i = 0; i < leimausKentat.length; i++) {
      if (leimausKentat[i].checked) {
        ekaKentta.setCustomValidity("");  // Tyhjennetään mahdollinen aikaisempi virheilmoitus
        return true;
      }
    }

    leimausKentat[0].setCustomValidity("Vähintään yksi leimaustapa on valittava");
    leimausKentat[0].reportValidity();
    return false;
  }


  /**
   * Tarkistaa lomakkeen jäsenkentät seuraavilla säännöillä:
   * 1. Joukkueella on oltava vähintään kaksi jäsentä.
   * 2. Jäsenet eivät voi olla samannimisiä.
   *
   * @param {HTMLFormElement} lomake - Lomake-elementti, joka sisältää jäsenkentät.
   * @returns {boolean} - true, jos tarkistukset onnistuvat, muuten false
   */
  function tarkistaJasenet(lomake) {
    // Tarkistetaan jäsenkentät
    const jasenKentat = lomake.elements["jasen"];
    const ekaKentta = jasenKentat[0];  // TODO: Virheilmoitukset oikeaan kenttään

    // Tarkistetaan, että jäsenkenttiä on tyhjänä enintään yksi
    const tyhjatKentat = tarkistaTyhjatKentat(jasenKentat);
    if (tyhjatKentat >= jasenKentat.length - 1) {
      ekaKentta.setCustomValidity("Joukkueella on oltava vähintään kaksi jäsentä");
      ekaKentta.reportValidity();
      return false;
    }
    ekaKentta.setCustomValidity("");  // Tyhjennetään mahdollinen aiempi virheilmoitus

    // Tarkistetaan, ettei jäsenkentissä ole samannimisiä
    const jasenKentatArray = Array.from(jasenKentat).map(el => el.value);  // Luodaan taulukko nimistä
    if (!ovatkoNimetUniikkeja(jasenKentatArray)) {
      ekaKentta.setCustomValidity("Jäsenet eivät voi olla samannimisiä");
      ekaKentta.reportValidity();
      return false;
    }
    ekaKentta.setCustomValidity("");  // Tyhjennetään mahdollinen aiempi virheilmoitus
    return true;
  }
  

  const lomake = document.forms[0];
  const sarjat = data.sarjat;
  const leimaustavat = data.leimaustavat;
  let valittuJoukkue = null;
  const submitPainike = lomake.elements["submit"];

  const jasenetContainer = document.getElementById('jasenetContainer');

  lomake.reset();  // Tyhjennetään lomake aina sivun päivittyessä

  jarjestaJaLuoSarjat(sarjat);
  jarjestaJaLuoLeimaustavat(leimaustavat);

  lisaaJasenKentta(lomake, jasenetContainer);
  lisaaJasenKentta(lomake, jasenetContainer);
  paivitaJoukkueLista(data);


  /**
   * Käsittelee input-tapahtumat jäsenkentissä.
   *
   * @listens input
   * @param {Event} event - input-tapahtuman tiedot.
   */
  jasenetContainer.addEventListener('input', function(event) {
    const target = event.target;
    if (target.classList.contains('jasen-kentta')) {
      const jasenKentat = lomake.elements["jasen"];
      const tyhjatKentat = tarkistaTyhjatKentat(jasenKentat);
  
      if (tyhjatKentat === 0) {
        lisaaJasenKentta(lomake, jasenetContainer);
      }
      else if (jasenKentat.length === 2) {  // Jätetään aina kaksi tyhjää kenttää
        return;
      }
      else if (tyhjatKentat > 1) {
        poistaJasenKentta(lomake, jasenetContainer);
      }

      lisaaRuksit(jasenKentat);
    }
  });


  /**
   * Käsittelee click-tapahtuman.
   * Tarkistaa joukkueen nimen ja jäsenten kentät. Jos tarkistukset epäonnistuvat,
   * funktio estää lomakkeen lähettämisen ja asettaa virheilmoituksen.
   *
   * @listens click
   * @param {Event} event - click-tapahtuman tiedot.
   */
  submitPainike.addEventListener('click',  function(event) {
    console.log("Click-tapahtumankäsittelijä aktivoitu"); 

    if (!tarkistaJoukkueenNimi(lomake, data, valittuJoukkue) ||
        !tarkistaLeimaustapa(lomake) ||
        !tarkistaJasenet(lomake)) {
      event.preventDefault();  // Estetään lähetys epäonnistuessa
    }
  });


  /**
   * Tapahtumankäsittelijä lomakkeen submit-tapahtumalle.
   * Estää lomakkeen automaattisen lähettämisen, täydentää joukkueobjektin,
   * lisää sen tietorakenteeseen, ja tallentaa päivitetyn datan LocalStorageen.
   *
   * @listens submit
   * @param {Event} event - submit-tapahtuman tiedot.
   */
  lomake.addEventListener("submit", function(event) {
    console.log("Submit-tapahtumankäsittelijä aktivoitu"); 
    event.preventDefault();  // Estetään lomakkeen automaattinen lähetys

    luoJaLisaaJoukkue(data, lomake);
    lomake.reset();

    // Poistetaan mahdolliset ylimääräiset jäsenkentät samalla
    while (lomake.elements['jasen'].length > 2) {
      poistaJasenKentta(lomake, jasenetContainer);
    }

    // Poistetaan mahdollisesti jääneet ruksit
    poistaElementit(jasenetContainer, '.remove-btn');

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
