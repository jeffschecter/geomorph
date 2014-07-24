package geomorph

import (
	"html/template"
	"net/http"
)

var mainPageTmpl = template.Must(template.ParseFiles(
	"templates/main_page.html"))

func MainPage(writer http.ResponseWriter, req *http.Request) {
	err := mainPageTmpl.ExecuteTemplate(writer, "base", "")
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}
}

func init() {
	http.HandleFunc("/", MainPage)
}
