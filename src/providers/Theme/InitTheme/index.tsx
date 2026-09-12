import React from 'react'

import { defaultTheme, themeLocalStorageKey } from '../ThemeSelector/types'

export const InitTheme: React.FC = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
  (function () {
    function getImplicitPreference() {
      try {
        var mediaQuery = '(prefers-color-scheme: dark)'
        var mql = window.matchMedia(mediaQuery)
        var hasImplicitPreference = typeof mql.matches === 'boolean'

        if (hasImplicitPreference) {
          return mql.matches ? 'dark' : 'light'
        }
      } catch (e) {}

      return null
    }

    function themeIsValid(theme) {
      return theme === 'light' || theme === 'dark'
    }

    var themeToSet = '${defaultTheme}'
    var preference = null

    try {
      preference = window.localStorage.getItem('${themeLocalStorageKey}')
    } catch (e) {}

    if (themeIsValid(preference)) {
      themeToSet = preference
    } else {
      var implicitPreference = getImplicitPreference()

      if (implicitPreference) {
        themeToSet = implicitPreference
      }
    }

    document.documentElement.setAttribute('data-theme', themeToSet)
  })();
  `,
      }}
      id="theme-script"
    />
  )
}
