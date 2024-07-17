// Cozy customization, replace Bitwarden by Cozy icons
//*
const logoIcon = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#297EF1' fill-rule='evenodd' d='M21 11a3 3 0 1 1-.83 5.88l-.04-.01-2.95 2.94c-.1.1-.22.16-.35.18l-.1.01h-.99c-.32 0-.68-.24-.73-.55l-.01-.09v-1.03c0-.16.11-.29.26-.32h.42c.16 0 .29-.11.32-.26v-.43c0-.15.11-.28.26-.31h.42c.15 0 .28-.12.31-.26v-.43c0-.15.12-.28.26-.31l.07-.01h.6c.16 0 .3-.11.32-.26l.01-.06v-.48c-.13-.3-.22-.64-.24-.99L18 14a3 3 0 0 1 3-3zM10.94 5a4.24 4.24 0 0 1 4.2 3.67c1.1.1 2.1.61 2.79 1.38a4.99 4.99 0 0 0-1.92 3.68L16 14v.28l.02.12-.04.03-.15.1c-.18.16-.35.35-.48.55l-.09.16-.01.03-.13.07-.15.1c-.24.17-.44.38-.6.62l-.11.2-.16.1c-.27.16-.5.38-.68.64H7.24A4.21 4.21 0 0 1 3 12.82c0-1.1.43-2.13 1.2-2.92a4.24 4.24 0 0 1 2.53-1.22A4.24 4.24 0 0 1 10.93 5zm9.65 7.52l-.16.03h-.04a.57.57 0 0 0-.29.88l.07.08 1.36 1.35c.31.28.82.12.92-.3.02-.08.04-.17.04-.26l.01-.13v-.08c-.02-.35-.14-.7-.38-.98l-.1-.12-.07-.06a1.67 1.67 0 0 0-1.36-.41zm-7.44-.72a.4.4 0 0 0-.4.4v.1l.02.1.03.1-.18.14a3 3 0 0 1-3.42-.13.97.97 0 0 0 .05-.3.4.4 0 0 0-.4-.41.4.4 0 0 0-.42.39.4.4 0 0 1-.1.25l-.05.06-.15.12a.39.39 0 0 0-.06.52.42.42 0 0 0 .5.14l.06-.03.1-.07.23.15a3.81 3.81 0 0 0 4.1-.02l.2-.13.1.07.08.03a.43.43 0 0 0 .49-.14.4.4 0 0 0 0-.46l-.06-.06-.13-.1a.46.46 0 0 1-.09-.1.55.55 0 0 1-.05-.11l-.02-.06-.02-.15a.4.4 0 0 0-.25-.27l-.07-.02-.09-.01z'/></svg>
  `;

const logoLockedIcon = `
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#297EF1' fill-rule='evenodd' d='M21 11a3 3 0 1 1-.83 5.88l-.04-.01-2.95 2.94c-.1.1-.22.16-.35.18l-.1.01h-.99c-.32 0-.68-.24-.73-.55l-.01-.09v-1.03c0-.16.11-.29.26-.32h.42c.16 0 .29-.11.32-.26v-.43c0-.15.11-.28.26-.31h.42c.15 0 .28-.12.31-.26v-.43c0-.15.12-.28.26-.31l.07-.01h.6c.16 0 .3-.11.32-.26l.01-.06v-.48c-.13-.3-.22-.64-.24-.99L18 14a3 3 0 0 1 3-3zM10.94 5a4.24 4.24 0 0 1 4.2 3.67c1.1.1 2.1.61 2.79 1.38a4.99 4.99 0 0 0-1.92 3.68L16 14v.28l.02.12-.04.03-.15.1c-.18.16-.35.35-.48.55l-.09.16-.01.03-.13.07-.15.1c-.24.17-.44.38-.6.62l-.11.2-.16.1c-.27.16-.5.38-.68.64H7.24A4.21 4.21 0 0 1 3 12.82c0-1.1.43-2.13 1.2-2.92a4.24 4.24 0 0 1 2.53-1.22A4.24 4.24 0 0 1 10.93 5zm9.65 7.52l-.16.03h-.04a.57.57 0 0 0-.29.88l.07.08 1.36 1.35c.31.28.82.12.92-.3.02-.08.04-.17.04-.26l.01-.13v-.08c-.02-.35-.14-.7-.38-.98l-.1-.12-.07-.06a1.67 1.67 0 0 0-1.36-.41zm-7.44-.72a.4.4 0 0 0-.4.4v.1l.02.1.03.1-.18.14a3 3 0 0 1-3.42-.13.97.97 0 0 0 .05-.3.4.4 0 0 0-.4-.41.4.4 0 0 0-.42.39.4.4 0 0 1-.1.25l-.05.06-.15.12a.39.39 0 0 0-.06.52.42.42 0 0 0 .5.14l.06-.03.1-.07.23.15a3.81 3.81 0 0 0 4.1-.02l.2-.13.1.07.08.03a.43.43 0 0 0 .49-.14.4.4 0 0 0 0-.46l-.06-.06-.13-.1a.46.46 0 0 1-.09-.1.55.55 0 0 1-.05-.11l-.02-.06-.02-.15a.4.4 0 0 0-.25-.27l-.07-.02-.09-.01z'/></svg>
`;
/*/
const logoIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none"><path fill="#175DDC" d="M12.66.175A.566.566 0 0 0 12.25 0H1.75a.559.559 0 0 0-.409.175.561.561 0 0 0-.175.41v7c.002.532.105 1.06.305 1.554.189.488.444.948.756 1.368.322.42.682.81 1.076 1.163.365.335.75.649 1.152.939.35.248.718.483 1.103.706.385.222.656.372.815.45.16.08.29.141.386.182A.53.53 0 0 0 7 14a.509.509 0 0 0 .238-.055c.098-.043.225-.104.387-.182.162-.079.438-.23.816-.45.378-.222.75-.459 1.102-.707.403-.29.788-.604 1.154-.939a8.435 8.435 0 0 0 1.076-1.163c.312-.42.567-.88.757-1.367a4.19 4.19 0 0 0 .304-1.555v-7a.55.55 0 0 0-.174-.407Z"/><path fill="#fff" d="M7 12.365s4.306-2.18 4.306-4.717V1.5H7v10.865Z"/></svg>';

const logoLockedIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><g clip-path="url(#a)"><path fill="#175DDC" d="M12.66.175A.566.566 0 0 0 12.25 0H1.75a.559.559 0 0 0-.409.175.561.561 0 0 0-.175.41v7c.002.532.105 1.06.305 1.554.189.488.444.948.756 1.368.322.42.682.81 1.076 1.163.365.335.75.649 1.152.939.35.248.718.483 1.103.706.385.222.656.372.815.45.16.08.29.141.386.182A.53.53 0 0 0 7 14a.509.509 0 0 0 .238-.055c.098-.043.225-.104.387-.182.162-.079.438-.23.816-.45.378-.222.75-.459 1.102-.707.403-.29.788-.604 1.154-.939a8.435 8.435 0 0 0 1.076-1.163c.312-.42.567-.88.757-1.367a4.19 4.19 0 0 0 .304-1.555v-7a.55.55 0 0 0-.174-.407Z"/><path fill="#fff" d="M7 12.365s4.306-2.18 4.306-4.717V1.5H7v10.865Z"/><circle cx="12.889" cy="12.889" r="4.889" fill="#F8F9FA"/><path fill="#555" d="M11.26 11.717h2.37v-.848c0-.313-.116-.58-.348-.8a1.17 1.17 0 0 0-.838-.332c-.327 0-.606.11-.838.332a1.066 1.066 0 0 0-.347.8v.848Zm3.851.424v2.546a.4.4 0 0 1-.13.3.44.44 0 0 1-.314.124h-4.445a.44.44 0 0 1-.315-.124.4.4 0 0 1-.13-.3V12.14a.4.4 0 0 1 .13-.3.44.44 0 0 1 .315-.124h.148v-.848c0-.542.204-1.008.612-1.397a2.044 2.044 0 0 1 1.462-.583c.568 0 1.056.194 1.463.583.408.39.611.855.611 1.397v.848h.149a.44.44 0 0 1 .315.124.4.4 0 0 1 .13.3Z"/></g><defs><clipPath id="a"><rect width="16" height="16" fill="#fff" rx="2"/></clipPath></defs></svg>';
//*/

const globeIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none"><path fill="#777" fill-rule="evenodd" d="M18.026 17.842c-1.418 1.739-3.517 2.84-5.86 2.84a7.364 7.364 0 0 1-3.431-.848l.062-.15.062-.151.063-.157c.081-.203.17-.426.275-.646.133-.28.275-.522.426-.68.026-.028.101-.075.275-.115.165-.037.376-.059.629-.073.138-.008.288-.014.447-.02.399-.016.847-.034 1.266-.092.314-.044.566-.131.755-.271a.884.884 0 0 0 .352-.555c.037-.2.008-.392-.03-.543-.035-.135-.084-.264-.12-.355l-.01-.03a4.26 4.26 0 0 0-.145-.33c-.126-.264-.237-.497-.288-1.085-.03-.344.09-.73.251-1.138l.089-.22c.05-.123.1-.247.14-.355.064-.171.129-.375.129-.566a1.51 1.51 0 0 0-.134-.569 2.573 2.573 0 0 0-.319-.547c-.246-.323-.635-.669-1.093-.669-.44 0-1.006.169-1.487.368-.246.102-.48.216-.68.33-.192.111-.372.235-.492.359-.93.96-1.48 1.239-1.81 1.258-.277.017-.478-.15-.736-.525a9.738 9.738 0 0 1-.19-.29l-.006-.01a11.568 11.568 0 0 0-.198-.305 2.76 2.76 0 0 0-.521-.6 1.39 1.39 0 0 0-1.088-.314 8.302 8.302 0 0 1 1.987-3.936c.055.342.146.626.272.856.23.42.561.64.926.716.406.086.857-.061 1.26-.216.125-.047.248-.097.372-.147.309-.125.618-.25.947-.341.26-.072.581-.057.959.012.264.049.529.118.8.19l.36.091c.379.094.782.178 1.135.148.374-.032.733-.197.934-.623a.874.874 0 0 0 .024-.752c-.087-.197-.24-.355-.35-.47-.26-.267-.412-.427-.412-.685 0-.125.037-.2.09-.263a.982.982 0 0 1 .303-.211c.059-.03.119-.058.183-.089l.036-.016a3.79 3.79 0 0 0 .236-.118c.047-.026.098-.056.148-.093 1.936.747 3.51 2.287 4.368 4.249a7.739 7.739 0 0 0-.031-.004c-.38-.047-.738-.056-1.063.061-.34.123-.603.368-.817.74-.122.211-.284.43-.463.67l-.095.129c-.207.281-.431.595-.58.92-.15.326-.245.705-.142 1.103.104.397.387.738.837 1.036.099.065.225.112.314.145l.02.008c.108.04.195.074.268.117.07.042.106.08.124.114.017.03.037.087.022.206-.047.376-.069.73-.052 1.034.017.292.071.59.218.809.118.174.12.421.108.786v.01a2.46 2.46 0 0 0 .021.518.809.809 0 0 0 .15.35Zm1.357.059a9.654 9.654 0 0 0 1.62-5.386c0-5.155-3.957-9.334-8.836-9.334-4.88 0-8.836 4.179-8.836 9.334 0 3.495 1.82 6.543 4.513 8.142v.093h.161a8.426 8.426 0 0 0 4.162 1.098c2.953 0 5.568-1.53 7.172-3.882a.569.569 0 0 0 .048-.062l-.004-.003ZM8.152 19.495a43.345 43.345 0 0 1 .098-.238l.057-.142c.082-.205.182-.455.297-.698.143-.301.323-.624.552-.864.163-.172.392-.254.602-.302.219-.05.473-.073.732-.088.162-.01.328-.016.495-.023.386-.015.782-.03 1.168-.084.255-.036.392-.099.461-.15.06-.045.076-.084.083-.12a.534.534 0 0 0-.02-.223 2.552 2.552 0 0 0-.095-.278l-.01-.027a3.128 3.128 0 0 0-.104-.232c-.134-.282-.31-.65-.374-1.381-.046-.533.138-1.063.3-1.472.035-.09.069-.172.1-.249.046-.11.086-.21.123-.31.062-.169.083-.264.083-.312a.812.812 0 0 0-.076-.283 1.867 1.867 0 0 0-.23-.394c-.21-.274-.428-.408-.577-.408-.315 0-.788.13-1.246.32a5.292 5.292 0 0 0-.603.293 1.727 1.727 0 0 0-.347.244c-.936.968-1.641 1.421-2.235 1.457-.646.04-1.036-.413-1.31-.813-.07-.103-.139-.21-.203-.311l-.005-.007c-.064-.101-.125-.197-.188-.29a2.098 2.098 0 0 0-.387-.453.748.748 0 0 0-.436-.18c-.1-.006-.22.005-.365.046a8.707 8.707 0 0 0-.056.992c0 2.957 1.488 5.547 3.716 6.98Zm10.362-2.316.003-.192.002-.046c.01-.305.026-.786-.232-1.169-.036-.054-.082-.189-.096-.444-.014-.243.003-.55.047-.9a1.051 1.051 0 0 0-.105-.649.987.987 0 0 0-.374-.374 2.285 2.285 0 0 0-.367-.166h-.003a1.243 1.243 0 0 1-.205-.088c-.369-.244-.505-.46-.549-.629-.044-.168-.015-.364.099-.61.115-.25.297-.511.507-.796l.089-.12c.178-.239.368-.495.512-.745.152-.263.302-.382.466-.441.18-.065.416-.073.77-.03.142.018.275.04.397.063.274.837.423 1.736.423 2.671a8.45 8.45 0 0 1-1.384 4.665Zm-4.632-12.63a7.362 7.362 0 0 0-1.715-.201c-1.89 0-3.621.716-4.965 1.905.025.54.12.887.24 1.105.13.238.295.34.482.38.2.042.484-.027.905-.188l.328-.13c.32-.13.681-.275 1.048-.377.398-.111.833-.075 1.24 0 .289.053.59.132.871.205l.326.084c.383.094.694.151.932.13.216-.017.326-.092.395-.237.039-.083.027-.114.014-.144-.027-.062-.088-.136-.212-.264l-.043-.044c-.218-.222-.567-.578-.567-1.142 0-.305.101-.547.262-.734.137-.159.308-.267.46-.347Z" clip-rule="evenodd"/></svg>';

const lockIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none"><g clip-path="url(#a)"><path fill="#175DDC" d="M8.799 11.633a.68.68 0 0 0-.639.422.695.695 0 0 0-.054.264.682.682 0 0 0 .374.6v1.13a.345.345 0 1 0 .693 0v-1.17a.68.68 0 0 0 .315-.56.695.695 0 0 0-.204-.486.682.682 0 0 0-.485-.2Zm4.554-4.657h-7.11a.438.438 0 0 1-.406-.26A3.81 3.81 0 0 1 5.584 4.3c.112-.435.312-.842.588-1.195A3.196 3.196 0 0 1 7.19 2.25a3.468 3.468 0 0 1 3.225-.059A3.62 3.62 0 0 1 11.94 3.71l.327.59a.502.502 0 1 0 .885-.483l-.307-.552a4.689 4.689 0 0 0-2.209-2.078 4.466 4.466 0 0 0-3.936.185A4.197 4.197 0 0 0 5.37 2.49a4.234 4.234 0 0 0-.768 1.565 4.714 4.714 0 0 0 .162 2.682.182.182 0 0 1-.085.22.173.173 0 0 1-.082.02h-.353a1.368 1.368 0 0 0-1.277.842c-.07.168-.107.348-.109.53v7.1a1.392 1.392 0 0 0 .412.974 1.352 1.352 0 0 0 .974.394h9.117c.363.001.711-.142.97-.4a1.39 1.39 0 0 0 .407-.972v-7.1a1.397 1.397 0 0 0-.414-.973 1.368 1.368 0 0 0-.972-.396Zm.37 8.469a.373.373 0 0 1-.11.26.364.364 0 0 1-.26.107H4.246a.366.366 0 0 1-.26-.107.374.374 0 0 1-.11-.261V8.349a.374.374 0 0 1 .11-.26.366.366 0 0 1 .26-.108h9.116a.366.366 0 0 1 .37.367l-.008 7.097Z"/></g><defs><clipPath id="a"><path fill="#fff" d="M.798.817h16v16h-16z"/></clipPath></defs></svg>';

const plusIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none"><g clip-path="url(#a)"><path fill="#175DDC" fill-rule="evenodd" d="M9.607 7.15h5.35c.322 0 .627.133.847.362a1.213 1.213 0 0 1 .002 1.68c-.221.23-.527.363-.85.363H9.607v5.652c0 .312-.12.613-.336.839a1.176 1.176 0 0 1-1.696.003 1.21 1.21 0 0 1-.34-.842V9.555H1.888a1.173 1.173 0 0 1-.847-.361A1.193 1.193 0 0 1 .7 8.352a1.219 1.219 0 0 1 .336-.838 1.175 1.175 0 0 1 .85-.364h5.349V1.635c0-.31.118-.611.336-.84A1.176 1.176 0 0 1 9.268.795c.222.228.34.533.34.841V7.15Z" clip-rule="evenodd"/></g><defs><clipPath id="a"><path fill="#fff" d="M.421.421h16v16h-16z"/></clipPath></defs></svg>';

// Cozy customization, replace Bitwarden by Cozy icons
//*
const viewCipherIcon =
'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M1 11C1.55228 11 2 11.4477 2 12C2 12.5523 1.55228 13 1 13C0.447715 13 0 12.5523 0 12C0 11.4477 0.447715 11 1 11ZM15 11C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13H5C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11H15ZM1 7C1.55228 7 2 7.44772 2 8C2 8.55228 1.55228 9 1 9C0.447715 9 0 8.55228 0 8C0 7.44772 0.447715 7 1 7ZM15 7C15.5523 7 16 7.44772 16 8C16 8.55228 15.5523 9 15 9H5C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7H15ZM1 3C1.55228 3 2 3.44772 2 4C2 4.55228 1.55228 5 1 5C0.447715 5 0 4.55228 0 4C0 3.44772 0.447715 3 1 3ZM15 3C15.5523 3 16 3.44772 16 4C16 4.55228 15.5523 5 15 5H5C4.44772 5 4 4.55228 4 4C4 3.44772 4.44772 3 5 3H15Z" fill="#1D212A" fill-opacity="0.72"/></svg>'
/*/
const viewCipherIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><g clip-path="url(#a)"><path fill="#175DDC" d="M16.587 7.932H5.9a.455.455 0 0 1-.31-.12.393.393 0 0 1-.127-.287c0-.108.046-.211.128-.288a.455.455 0 0 1 .309-.119h10.687c.117 0 .228.043.31.12.082.076.128.179.128.287a.393.393 0 0 1-.128.288.455.455 0 0 1-.31.119Zm0 2.474H5.9a.455.455 0 0 1-.31-.119.393.393 0 0 1-.127-.287c0-.108.046-.212.128-.288a.455.455 0 0 1 .309-.119h10.687c.117 0 .228.043.31.12.082.075.128.179.128.287a.393.393 0 0 1-.128.287.455.455 0 0 1-.31.12Zm0 2.468H5.9a.455.455 0 0 1-.31-.119.393.393 0 0 1-.127-.287c0-.108.046-.212.128-.288a.455.455 0 0 1 .309-.119h10.687c.117 0 .228.043.31.12.082.075.128.179.128.287a.393.393 0 0 1-.128.287.455.455 0 0 1-.31.12Zm2.163-8.103v10.457H1.25V4.771h17.5Zm0-1.162H1.25a1.3 1.3 0 0 0-.884.34A1.122 1.122 0 0 0 0 4.772v10.457c0 .308.132.604.366.822a1.3 1.3 0 0 0 .884.34h17.5a1.3 1.3 0 0 0 .884-.34c.234-.218.366-.514.366-.822V4.771c0-.308-.132-.603-.366-.821a1.3 1.3 0 0 0-.884-.34ZM3.213 8.01c.287 0 .52-.217.52-.484s-.234-.483-.52-.483c-.288 0-.52.216-.52.483s.233.483.52.483Zm0 4.903c.287 0 .52-.217.52-.484 0-.266-.234-.483-.52-.483-.287 0-.52.216-.52.483s.233.484.52.484Zm0-2.452c.287 0 .52-.216.52-.483 0-.268-.234-.484-.52-.484-.288 0-.52.216-.52.484 0 .267.233.483.52.483Z"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 .113h20v19.773H0z"/></clipPath></defs></svg>';
//*/

export { logoIcon, logoLockedIcon, globeIcon, lockIcon, plusIcon, viewCipherIcon };
